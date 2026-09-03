import crypto from "node:crypto";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/db";
import { decryptField, encryptField, hashToken } from "@/lib/crypto";
import { env } from "@/config/env";
import { AuditService } from "./audit.service";
import { TrustService } from "./trust.service";
import { logSecurityEvent } from "@/lib/logger";

const recoveryCodeCount = 10;

function createTotp(secret: string, email: string) {
  return new OTPAuth.TOTP({ issuer: env.MFA_TOTP_ISSUER, label: email, algorithm: "SHA1", digits: 6, period: 30, secret });
}

function generateRecoveryCodes() {
  return Array.from({ length: recoveryCodeCount }, () => crypto.randomBytes(5).toString("hex").toUpperCase());
}

export const MfaService = {
  async setup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabled: true } });
    if (!user) throw new Error("User not found");
    if (user.mfaEnabled) throw new Error("MFA is already enabled");

    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const encryptedSecret = encryptField(secret, env.ENCRYPTION_KEY);
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: encryptedSecret, mfaBackupCodes: [] } });

    const totp = createTotp(secret, user.email);
    return { otpauthUri: totp.toString() };
  },

  async confirm(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaSecret: true, mfaEnabled: true } });
    if (!user?.mfaSecret || user.mfaEnabled) throw new Error("MFA setup is not pending");
    const secret = decryptField(user.mfaSecret, env.ENCRYPTION_KEY);
    const valid = createTotp(secret, user.email).validate({ token: code, window: env.MFA_TOTP_WINDOW }) !== null;
    if (!valid) throw new Error("Invalid MFA code");

    const recoveryCodes = generateRecoveryCodes();
    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaBackupCodes: recoveryCodes.map(hashToken) } });
    await TrustService.emitTrustEvent({ userId, eventType: "MFA_ENABLED", category: "BEHAVIOR", reason: "Time-based multi-factor authentication enabled" });
    await AuditService.log({ actorId: userId, action: "MFA_ENABLED", resource: "User", resourceId: userId });
    logSecurityEvent({ action: "MFA_ENABLED", actorId: userId, status: "SUCCESS" });
    return { recoveryCodes };
  },

  async verify(userId: string, code?: string, recoveryCode?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true } });
    if (!user?.mfaEnabled || !user.mfaSecret) throw new Error("MFA is not enabled");

    let valid = false;
    let usedRecoveryIndex = -1;
    if (code) {
      const secret = decryptField(user.mfaSecret, env.ENCRYPTION_KEY);
      valid = createTotp(secret, user.email).validate({ token: code, window: env.MFA_TOTP_WINDOW }) !== null;
    } else if (recoveryCode) {
      const recoveryHash = hashToken(recoveryCode.trim().toUpperCase());
      usedRecoveryIndex = user.mfaBackupCodes.findIndex((storedHash) => crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(recoveryHash, "hex")));
      valid = usedRecoveryIndex >= 0;
    }

    if (!valid) {
      logSecurityEvent({ action: "MFA_VERIFICATION_FAILED", actorId: userId, status: "FAILURE" });
      throw new Error("Invalid MFA code");
    }

    if (usedRecoveryIndex >= 0) {
      const consumed = user.mfaBackupCodes.filter((_, index) => index !== usedRecoveryIndex);
      await prisma.user.updateMany({ where: { id: userId, mfaBackupCodes: { has: user.mfaBackupCodes[usedRecoveryIndex] } }, data: { mfaBackupCodes: consumed } });
    }
    logSecurityEvent({ action: "MFA_VERIFICATION_SUCCESS", actorId: userId, status: "SUCCESS" });
  },

  async disable(userId: string, password: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await import("@/lib/argon2")).verifyPassword(user.passwordHash, password)) throw new Error("Re-authentication failed");
    await this.verify(userId, code);
    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: [] } });
    await AuditService.log({ actorId: userId, action: "MFA_DISABLED", resource: "User", resourceId: userId });
    logSecurityEvent({ action: "MFA_DISABLED", actorId: userId, status: "SUCCESS" });
  },
};