import { prisma } from "@/lib/db";
import { getCredentialJwks, signCredentialJwt, verifyCredentialJwt } from "@/lib/jwt";
import { TrustService } from "./trust.service";
import { AuditService } from "./audit.service";
import type { Prisma } from "@prisma/client";
import type { IssueCredentialInput } from "@/lib/validations";
import type { AuthSession } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Verifiable Credential Engine
// ─────────────────────────────────────────────────────────────────────────────

export const CredentialService = {
  /** Issue a VC-JWT signed with the configured issuer private key. */
  async issueCredential(
    issuerUserId: string,
    organizationId: string,
    input: IssueCredentialInput
  ) {
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: issuerUserId,
        organizationId,
        role: { in: ["OWNER", "ADMIN", "VERIFIER"] },
        isActive: true,
      },
    });

    if (!membership) {
      throw new Error("Unauthorized to issue credentials on behalf of this organization");
    }

    const vcPayload = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        `https://trustdna.io/schemas/${input.credentialType}/v1`,
      ],
      type: ["VerifiableCredential", input.credentialType],
      issuer: { id: `did:trustdna:org:${organizationId}` },
      issuanceDate: new Date().toISOString(),
      expirationDate: input.expiresAt,
      credentialSubject: {
        id: `did:trustdna:user:${input.subjectUserId}`,
        ...input.claims,
      },
    };

    const signedJwt = await signCredentialJwt(vcPayload);

    const credential = await prisma.credential.create({
      data: {
        issuerId: issuerUserId,
        subjectUserId: input.subjectUserId,
        organizationId,
        credentialType: input.credentialType,
        schemaVersion: "2.0",
        claims: input.claims as Prisma.InputJsonValue,
        signedJwt,
        publicKeyId: process.env.VC_ISSUER_KEY_ID || "",
        status: "ACTIVE",
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      include: {
        issuer: { select: { id: true, firstName: true, lastName: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    await TrustService.emitTrustEvent({
      userId: input.subjectUserId,
      eventType: "CREDENTIAL_ISSUED",
      category: "CREDENTIAL",
      reason: `Received ${input.credentialType} credential from ${credential.organization.name}`,
      sourceEntityId: credential.id,
      sourceEntityType: "Credential",
    });

    AuditService.logAsync({
      actorId: issuerUserId,
      organizationId,
      action: "CREDENTIAL_ISSUED",
      resource: "Credential",
      resourceId: credential.id,
    });

    return credential;
  },

  async getPublicKeys() {
    return getCredentialJwks();
  },

  /** Public verification of a Credential JWT token */
  async verifyCredential(token: string) {
    const cryptoResult = await verifyCredentialJwt(token);
    if (!cryptoResult.valid || !cryptoResult.payload) {
      return {
        valid: false,
        status: "INVALID_SIGNATURE",
        reason: cryptoResult.error || "Cryptographic signature check failed",
      };
    }

    const payload = cryptoResult.payload;

    const credential = await prisma.credential.findFirst({
      where: { signedJwt: token },
      include: {
        issuer: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true, verificationStatus: true } },
      },
    });

    if (!credential) {
      const expirationDate = typeof payload.expirationDate === "string" ? new Date(payload.expirationDate) : null;
      if (expirationDate && expirationDate <= new Date()) {
        return { valid: false, status: "EXPIRED", reason: "Credential has expired", expiresAt: expirationDate };
      }
      return {
        valid: true,
        status: "ACTIVE",
        claims: payload.credentialSubject as Record<string, unknown>,
        issuer: payload.issuer,
        expirationDate: payload.expirationDate,
        note: "Verified via cryptographic signature check",
      };
    }

    if (credential.status === "REVOKED") {
      return {
        valid: false,
        status: "REVOKED",
        reason: credential.revocationReason || "Credential was revoked by issuer",
        revokedAt: credential.revokedAt,
      };
    }

    if (credential.status === "SUSPENDED") {
      return {
        valid: false,
        status: "SUSPENDED",
        reason: "Credential is currently suspended by issuer",
      };
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return {
        valid: false,
        status: "EXPIRED",
        reason: "Credential has expired",
        expiresAt: credential.expiresAt,
      };
    }

    return {
      valid: true,
      status: "ACTIVE",
      credentialType: credential.credentialType,
      claims: credential.claims,
      issuer: `${credential.organization.name} (${credential.issuer.firstName} ${credential.issuer.lastName})`,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
    };
  },

  /** Fetch a credential only for an authorized participant in its trust relationship. */
  async getCredentialForActor(credentialId: string, actor: AuthSession) {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      include: {
        issuer: { select: { id: true, firstName: true, lastName: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!credential) {
      throw new Error("Credential not found");
    }

    const isPlatformAdmin = actor.role === "PLATFORM_ADMIN";
    const isSubject = credential.subjectUserId === actor.userId;
    const isIssuer = credential.issuerId === actor.userId;
    const membership = await prisma.orgMembership.findFirst({
      where: { organizationId: credential.organizationId, userId: actor.userId, isActive: true },
      select: { id: true },
    });

    if (!isPlatformAdmin && !isSubject && !isIssuer && !membership) {
      throw new Error("Unauthorized to access this credential");
    }

    return credential;
  },

  /** Revoke a credential */
  async revokeCredential(credentialId: string, actor: AuthSession, reason: string) {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new Error("Credential not found");
    }

    const isPlatformAdmin = actor.role === "PLATFORM_ADMIN";
    const isIssuer = credential.issuerId === actor.userId;
    const membership = await prisma.orgMembership.findFirst({
      where: {
        organizationId: credential.organizationId,
        userId: actor.userId,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
      },
      select: { id: true },
    });

    if (!isPlatformAdmin && !isIssuer && !membership) {
      throw new Error("Unauthorized to revoke this credential");
    }

    const updated = await prisma.credential.update({
      where: { id: credentialId },
      data: {
        status: "REVOKED",
        revocationReason: reason,
        revokedById: actor.userId,
        revokedAt: new Date(),
      },
    });

    await TrustService.emitTrustEvent({
      userId: credential.subjectUserId,
      eventType: "CREDENTIAL_REVOKED",
      category: "CREDENTIAL",
      reason: `Credential ${credential.credentialType} was revoked: ${reason}`,
      sourceEntityId: credentialId,
      sourceEntityType: "Credential",
    });

    await AuditService.log({
      actorId: actor.userId,
      organizationId: credential.organizationId,
      action: "CREDENTIAL_REVOKED",
      resource: "Credential",
      resourceId: credentialId,
      metadata: { reason },
    });

    return updated;
  },

  /** Get active credentials for a subject user */
  async getSubjectCredentials(subjectUserId: string) {
    return await prisma.credential.findMany({
      where: {
        subjectUserId,
        deletedAt: null,
      },
      include: {
        issuer: { select: { id: true, firstName: true, lastName: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  },
};
