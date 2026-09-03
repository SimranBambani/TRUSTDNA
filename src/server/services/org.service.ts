import { prisma } from "@/lib/db";
import { generateRandomToken, hashToken, verifyToken } from "@/lib/crypto";
import { AuditService } from "./audit.service";
import type { CreateOrgInput } from "@/lib/validations";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Organization & API Key Service
// ─────────────────────────────────────────────────────────────────────────────

export const OrgService = {
  async getMembership(userId: string, organizationId: string) {
    return prisma.orgMembership.findFirst({
      where: { userId, organizationId, isActive: true },
      select: { id: true, role: true },
    });
  },
  /** Create a new Organization */
  async createOrganization(ownerUserId: string, input: CreateOrgInput) {
    const existing = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new Error("An organization with this slug already exists");
    }

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          ownerId: ownerUserId,
          name: input.name,
          slug: input.slug,
          domain: input.domain,
          website: input.website,
          description: input.description,
          status: "ACTIVE",
          verificationStatus: "UNVERIFIED",
          memberCount: 1,
        },
      });

      // Add owner membership
      await tx.orgMembership.create({
        data: {
          organizationId: newOrg.id,
          userId: ownerUserId,
          role: "OWNER",
          isActive: true,
        },
      });

      // Create initial Org TrustScore
      await tx.trustScore.create({
        data: {
          organizationId: newOrg.id,
          score: 100,
          tier: "BRONZE",
        },
      });

      return newOrg;
    });

    AuditService.logAsync({
      actorId: ownerUserId,
      organizationId: org.id,
      action: "ORG_CREATED",
      resource: "Organization",
      resourceId: org.id,
    });

    return org;
  },

  /** Generate an API Key for machine-to-machine integration */
  async generateApiKey(ownerUserId: string, organizationId: string, name: string, scopes: string[], expiresAt?: Date) {
    // Check permission
    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: ownerUserId,
        organizationId,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
      },
    });

    if (!membership) {
      throw new Error("Unauthorized to create API keys for this organization");
    }

    const rawKey = `tdna_live_${generateRandomToken(24)}`;
    const keyHash = hashToken(rawKey);
    const prefix = rawKey.substring(0, 14);
    const apiKey = await prisma.apiKey.create({
      data: { organizationId, name, keyPrefix: prefix, keyHash, scopes, expiresAt },
    });

    // Save metadata in audit/metadata store
    AuditService.logAsync({
      actorId: ownerUserId,
      organizationId,
      action: "API_KEY_CREATED",
      resource: "ApiKey",
      resourceId: apiKey.id,
      metadata: { name, prefix, scopes },
    });

    return {
      rawKey,
      id: apiKey.id,
      prefix,
      name,
      scopes,
      expiresAt: apiKey.expiresAt,
    };
  },

  async listApiKeys(userId: string, organizationId: string) {
    await this.requireOrgAdmin(userId, organizationId);
    return prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true, status: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async revokeApiKey(userId: string, organizationId: string, keyId: string) {
    await this.requireOrgAdmin(userId, organizationId);
    const result = await prisma.apiKey.updateMany({
      where: { id: keyId, organizationId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    if (result.count === 0) throw new Error("API key not found or already revoked");
    AuditService.logAsync({ actorId: userId, organizationId, action: "API_KEY_REVOKED", resource: "ApiKey", resourceId: keyId });
    return { id: keyId, status: "REVOKED" as const };
  },

  async authenticateApiKey(rawKey: string, requiredScope?: string) {
    const keyPrefix = rawKey.substring(0, 14);
    const candidates = await prisma.apiKey.findMany({
      where: { keyPrefix },
      include: { organization: { select: { status: true, deletedAt: true } } },
    });
    const apiKey = candidates.find((candidate) => verifyToken(rawKey, candidate.keyHash));
    if (!apiKey) throw new Error("Invalid API key");
    if (apiKey.organization.status !== "ACTIVE" || apiKey.organization.deletedAt) {
      throw new Error("Organization is not active");
    }
    const now = new Date();
    if (apiKey.status === "REVOKED" || apiKey.revokedAt) throw new Error("API key is revoked");
    if (apiKey.status === "EXPIRED" || (apiKey.expiresAt && apiKey.expiresAt <= now)) {
      if (apiKey.status !== "EXPIRED") {
        await prisma.apiKey.update({ where: { id: apiKey.id }, data: { status: "EXPIRED" } });
      }
      throw new Error("API key is expired");
    }
    if (requiredScope && !apiKey.scopes.includes(requiredScope)) throw new Error("API key lacks required permission");
    await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
    AuditService.logAsync({ organizationId: apiKey.organizationId, action: "API_KEY_USED", resource: "ApiKey", resourceId: apiKey.id });
    return { organizationId: apiKey.organizationId, apiKeyId: apiKey.id, scopes: apiKey.scopes };
  },

  async requireOrgAdmin(userId: string, organizationId: string) {
    const membership = await prisma.orgMembership.findFirst({
      where: { userId, organizationId, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
    });
    if (!membership) throw new Error("Unauthorized to manage API keys for this organization");
    return membership;
  },

  /** Get organization members */
  async getMembers(organizationId: string) {
    return await prisma.orgMembership.findMany({
      where: { organizationId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  },

  /** Get organizations the authenticated user belongs to. */
  async getUserOrganizations(userId: string) {
    return await prisma.orgMembership.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          include: { trustScore: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  },
};
