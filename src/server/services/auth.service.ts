import crypto from "node:crypto";
import dns from "node:dns/promises";
import { hashPassword, verifyPassword } from "@/lib/argon2";
import { prisma } from "@/lib/db";
import { generateAccessToken, generateMfaChallenge, generateRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { hashToken } from "@/lib/crypto";
import { AuditService } from "./audit.service";
import { TrustService } from "./trust.service";
import { logSecurityEvent } from "@/lib/logger";
import type { RegisterInput, LoginInput } from "@/lib/validations";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Authentication Service (Argon2id Security Engine)
// ─────────────────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "temp-mail.org",
];

async function verifyEmailDomain(email: string): Promise<void> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    throw new Error("Invalid email format");
  }

  if (DISPOSABLE_DOMAINS.includes(domain)) {
    throw new Error("Temporary or disposable email addresses are not allowed.");
  }

  if (process.env.NODE_ENV === "development") {
    return;
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      throw new Error(`The email domain @${domain} does not exist or cannot receive emails.`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("disposable")) {
      throw err;
    }
    if (msg.includes("ENOTFOUND") || msg.includes("NODATA") || msg.includes("SERVFAIL")) {
      throw new Error(`The email domain @${domain} does not exist or has no active mail servers.`);
    }
  }
}

export interface RegisterResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    emailVerified: boolean;
  };
  emailVerificationToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    trustTier: string;
  };
  accessToken?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  tempToken?: string;
}

export const AuthService = {
  /** Register a new User requiring email verification */
  async register(input: RegisterInput, ipAddress?: string, userAgent?: string): Promise<RegisterResult> {
    const emailLower = input.email.toLowerCase().trim();

    // Verify email domain DNS MX records and block disposable providers
    await verifyEmailDomain(emailLower);

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      throw new Error("An account with this email address already exists");
    }

    // Secure Argon2id password hashing
    const passwordHash = await hashPassword(input.password);

    // Cryptographically random 32-byte email verification token
    const rawVerifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = hashToken(rawVerifyToken);
    const verifyExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: emailLower,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "USER",
          status: "PENDING",
          emailVerified: false,
          emailVerifyToken: hashedVerifyToken,
          emailVerifyExpires: verifyExpires,
        },
      });

      await tx.trustScore.create({
        data: {
          userId: newUser.id,
          score: 0,
          tier: "BRONZE",
          identityScore: 0,
          behaviorScore: 0,
          credentialScore: 0,
          fraudPenalty: 0,
        },
      });

      return newUser;
    });

    AuditService.logAsync({
      actorId: user.id,
      action: "USER_REGISTER",
      resource: "User",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    logSecurityEvent({
      action: "USER_REGISTER_SUCCESS",
      actorId: user.id,
      ipAddress,
      userAgent,
      status: "SUCCESS",
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
      },
      emailVerificationToken: rawVerifyToken,
    };
  },

  /** Verify user email address via token */
  async verifyEmail(token: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const hashedToken = hashToken(token.trim());

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashedToken,
        emailVerifyExpires: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new Error("Invalid or expired email verification link. Please request a new verification email.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: "ACTIVE",
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    // Emit Trust Event (+50 points)
    await TrustService.emitTrustEvent({
      userId: user.id,
      eventType: "EMAIL_VERIFIED",
      category: "IDENTITY",
      reason: "Email ownership successfully verified",
    });

    AuditService.logAsync({
      actorId: user.id,
      action: "EMAIL_VERIFIED",
      resource: "User",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    logSecurityEvent({
      action: "EMAIL_VERIFICATION_SUCCESS",
      actorId: user.id,
      ipAddress,
      userAgent,
      status: "SUCCESS",
    });
  },

  /** Resend email verification token */
  async resendVerification(email: string, ipAddress?: string, userAgent?: string): Promise<{ verificationToken?: string }> {
    const emailLower = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user || user.deletedAt || user.emailVerified) {
      return {};
    }

    const rawVerifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = hashToken(rawVerifyToken);
    const verifyExpires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashedVerifyToken,
        emailVerifyExpires: verifyExpires,
      },
    });

    AuditService.logAsync({
      actorId: user.id,
      action: "EMAIL_VERIFICATION_RESENT",
      resource: "User",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    return { verificationToken: rawVerifyToken };
  },

  /** Login user and verify credentials & email verification state */
  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const emailLower = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      include: { trustScore: true },
    });

    // Generic error response to prevent user enumeration
    if (!user || user.deletedAt) {
      logSecurityEvent({
        action: "LOGIN_FAILED_UNKNOWN_USER",
        ipAddress,
        userAgent,
        status: "FAILURE",
      });
      throw new Error("Invalid email or password.");
    }

    if (user.status === "BANNED" || user.status === "SUSPENDED") {
      logSecurityEvent({
        action: "LOGIN_FAILED_BLOCKED_STATUS",
        actorId: user.id,
        ipAddress,
        userAgent,
        status: "SUSPICIOUS",
      });
      throw new Error("Invalid email or password.");
    }

    const isValidPassword = await verifyPassword(user.passwordHash, input.password);
    if (!isValidPassword) {
      AuditService.logAsync({
        actorId: user.id,
        action: "LOGIN_FAILED",
        resource: "User",
        resourceId: user.id,
        ipAddress,
        userAgent,
        isSuccess: false,
      });

      logSecurityEvent({
        action: "LOGIN_FAILED_BAD_PASSWORD",
        actorId: user.id,
        ipAddress,
        userAgent,
        status: "FAILURE",
      });

      throw new Error("Invalid email or password.");
    }

    // Require email verification before allowing login
    if (!user.emailVerified) {
      logSecurityEvent({
        action: "LOGIN_FAILED_UNVERIFIED_EMAIL",
        actorId: user.id,
        ipAddress,
        userAgent,
        status: "FAILURE",
      });
      throw new Error("Please verify your email address before signing in.");
    }

    if (user.mfaEnabled) {
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          trustTier: user.trustScore?.tier || "BRONZE",
        },
        mfaRequired: true,
        tempToken: await this.createMfaChallenge(user.id),
      };
    }

    // Rehash legacy bcrypt password to Argon2id upon successful login
    if (!user.passwordHash.startsWith("$argon2")) {
      const newArgonHash = await hashPassword(input.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newArgonHash },
      });
    }

    const trustTier = user.trustScore?.tier || "BRONZE";

    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      trustTier,
    });

    const { token: refreshToken } = await generateRefreshToken(user.id);
    const tokenHash = hashToken(refreshToken);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceFingerprint: input.deviceFingerprint,
        ipAddress,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    AuditService.logAsync({
      actorId: user.id,
      action: "USER_LOGIN",
      resource: "User",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    logSecurityEvent({
      action: "USER_LOGIN_SUCCESS",
      actorId: user.id,
      ipAddress,
      userAgent,
      status: "SUCCESS",
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        trustTier,
      },
      accessToken,
      refreshToken,
    };
  },

  async completeMfaLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { trustScore: true } });
    if (!user || user.deletedAt || user.status === "BANNED" || user.status === "SUSPENDED") throw new Error("Unable to complete login");
    const accessToken = await generateAccessToken({ sub: user.id, email: user.email, role: user.role, trustTier: user.trustScore?.tier || "BRONZE" });
    const { token: refreshToken } = await generateRefreshToken(user.id);
    await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(refreshToken), ipAddress, isActive: true, isMfaVerified: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    AuditService.logAsync({ actorId: user.id, action: "USER_LOGIN_MFA_SUCCESS", resource: "User", resourceId: user.id, ipAddress, userAgent });
    return { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, status: user.status, trustTier: user.trustScore?.tier || "BRONZE" }, accessToken, refreshToken };
  },

  /** Generate secure password reset token (valid 1 hour) */
  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<{ resetToken?: string }> {
    const emailLower = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    // Don't leak whether user exists to prevent account enumeration
    if (!user || user.deletedAt) {
      return {};
    }

    // Generate cryptographically secure random token (32 bytes hex)
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpires: expiresAt,
      },
    });

    AuditService.logAsync({
      actorId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      resource: "User",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    logSecurityEvent({
      action: "PASSWORD_RESET_REQUESTED",
      actorId: user.id,
      ipAddress,
      userAgent,
      status: "SUCCESS",
    });

    return { resetToken: rawResetToken };
  },

  /** Reset password using token */
  async resetPassword(token: string, newPassword: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const hashedResetToken = hashToken(token.trim());

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedResetToken,
        resetTokenExpires: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new Error("Invalid or expired password reset token. Please request a new password reset link.");
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    // Invalidate all active sessions for security
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false, revokedAt: new Date(), revocationReason: "PASSWORD_RESET" },
    });

    AuditService.logAsync({
      actorId: user.id,
      action: "PASSWORD_RESET_SUCCESS",
      resource: "User",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    logSecurityEvent({
      action: "PASSWORD_RESET_COMPLETED",
      actorId: user.id,
      ipAddress,
      userAgent,
      status: "SUCCESS",
    });
  },

  /** Refresh token rotation */
  async refreshToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; newRefreshToken: string }> {
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error("Invalid refresh token");
    }

    const oldHash = hashToken(refreshToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash: oldHash },
      include: { user: { include: { trustScore: true } } },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new Error("Session expired or revoked");
    }

    const consumed = await prisma.session.updateMany({
      where: { id: session.id, isActive: true, expiresAt: { gt: new Date() } },
      data: { isActive: false, revokedAt: new Date(), revocationReason: "ROTATED" },
    });
    if (consumed.count !== 1) throw new Error("Session expired or revoked");

    const newAccessToken = await generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      trustTier: session.user.trustScore?.tier || "BRONZE",
    });

    const { token: newRefreshToken } = await generateRefreshToken(session.user.id);
    const newHash = hashToken(newRefreshToken);

    await prisma.session.create({
      data: {
        userId: session.user.id,
        tokenHash: newHash,
        deviceFingerprint: session.deviceFingerprint,
        ipAddress,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    AuditService.logAsync({
      actorId: session.user.id,
      action: "TOKEN_REFRESHED",
      resource: "Session",
      ipAddress,
      userAgent,
    });

    return { accessToken: newAccessToken, newRefreshToken };
  },

  async createMfaChallenge(userId: string): Promise<string> {
    const token = await generateMfaChallenge(userId);
    await prisma.mfaChallenge.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    return token;
  },

  async consumeMfaChallenge(token: string): Promise<string | null> {
    const consumedAt = new Date();
    const challenge = await prisma.mfaChallenge.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= consumedAt) return null;
    const result = await prisma.mfaChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: consumedAt } },
      data: { consumedAt },
    });
    return result.count === 1 ? challenge.userId : null;
  },

  /** Logout — revoke active session */
  async logout(refreshToken?: string, userId?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.session.updateMany({
        where: { tokenHash },
        data: { isActive: false, revokedAt: new Date(), revocationReason: "USER_LOGOUT" },
      });
    } else if (userId) {
      await prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revocationReason: "USER_LOGOUT_ALL" },
      });
    }
  },
};
