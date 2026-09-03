import { prisma } from "@/lib/db";
import { TRUST_EVENT_WEIGHTS, TRUST_DECAY_RATES } from "@/config/constants";
import { AuditService } from "./audit.service";
import type { Prisma } from "@prisma/client";
import type { TrustEventType, TrustEventCategory, TrustTier } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Trust Score Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface EmitTrustEventInput {
  userId?: string;
  organizationId?: string;
  eventType: TrustEventType;
  category: TrustEventCategory;
  reason: string;
  description?: string;
  sourceEntityId?: string;
  sourceEntityType?: string;
  metadata?: Record<string, unknown>;
}

export const TrustService = {
  /** Emit a new TrustEvent, record it in ledger, and recalculate the score */
  async emitTrustEvent(input: EmitTrustEventInput): Promise<void> {
    const baseDelta = TRUST_EVENT_WEIGHTS[input.eventType] ?? 0;
    const decayRate = TRUST_DECAY_RATES[input.category] ?? 0.001;

    await prisma.trustEvent.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        eventType: input.eventType,
        category: input.category,
        scoreDelta: baseDelta,
        decayRate,
        reason: input.reason,
        description: input.description,
        sourceEntityId: input.sourceEntityId,
        sourceEntityType: input.sourceEntityType,
        metadata: input.metadata as Prisma.InputJsonValue,
        isProcessed: true,
        occurredAt: new Date(),
      },
    });

    if (input.userId) {
      await this.calculateScore(input.userId);
    } else if (input.organizationId) {
      await this.calculateOrgScore(input.organizationId);
    }

    AuditService.logAsync({
      actorId: input.userId,
      organizationId: input.organizationId,
      action: "TRUST_EVENT_EMITTED",
      resource: "TrustEvent",
      metadata: { eventType: input.eventType, delta: baseDelta },
    });
  },

  /** Compute exponential decay score for a user */
  async calculateScore(userId: string) {
    const events = await prisma.trustEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
    });

    let identityScore = 0;
    let credentialScore = 0;
    let behaviorScore = 0;
    let fraudPenalty = 0;

    const now = Date.now();

    for (const evt of events) {
      const ageInDays = (now - new Date(evt.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
      const effectiveDelta = Math.round(evt.scoreDelta * Math.exp(-evt.decayRate * ageInDays));

      switch (evt.category) {
        case "IDENTITY":
          identityScore += Math.max(0, effectiveDelta);
          break;
        case "CREDENTIAL":
          credentialScore += Math.max(0, effectiveDelta);
          break;
        case "BEHAVIOR":
        case "SOCIAL":
          behaviorScore += Math.max(0, effectiveDelta);
          break;
        case "FRAUD":
          if (effectiveDelta < 0) {
            fraudPenalty += Math.abs(effectiveDelta);
          }
          break;
      }
    }

    identityScore = Math.min(350, identityScore);
    credentialScore = Math.min(350, credentialScore);
    behaviorScore = Math.min(300, behaviorScore);

    const totalRaw = identityScore + credentialScore + behaviorScore - fraudPenalty;
    const finalScore = Math.min(1000, Math.max(0, totalRaw));

    let tier: TrustTier = "BRONZE";
    if (finalScore >= 850) tier = "PLATINUM";
    else if (finalScore >= 600) tier = "GOLD";
    else if (finalScore >= 300) tier = "SILVER";

    return await prisma.trustScore.upsert({
      where: { userId },
      create: {
        userId,
        score: finalScore,
        tier,
        identityScore,
        behaviorScore,
        credentialScore,
        fraudPenalty,
        lastCalculatedAt: new Date(),
      },
      update: {
        score: finalScore,
        tier,
        identityScore,
        behaviorScore,
        credentialScore,
        fraudPenalty,
        lastCalculatedAt: new Date(),
        version: { increment: 1 },
      },
    });
  },

  /** Compute score for an organization */
  async calculateOrgScore(organizationId: string) {
    const events = await prisma.trustEvent.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
    });

    let score = 0;
    const now = Date.now();

    for (const evt of events) {
      const ageInDays = (now - new Date(evt.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.round(evt.scoreDelta * Math.exp(-evt.decayRate * ageInDays));
    }

    const finalScore = Math.min(1000, Math.max(0, score));

    let tier: TrustTier = "BRONZE";
    if (finalScore >= 850) tier = "PLATINUM";
    else if (finalScore >= 600) tier = "GOLD";
    else if (finalScore >= 300) tier = "SILVER";

    return await prisma.trustScore.upsert({
      where: { organizationId },
      create: {
        organizationId,
        score: finalScore,
        tier,
        lastCalculatedAt: new Date(),
      },
      update: {
        score: finalScore,
        tier,
        lastCalculatedAt: new Date(),
        version: { increment: 1 },
      },
    });
  },

  /** Get user score & recent events */
  async getUserTrustData(userId: string) {
    let score = await prisma.trustScore.findUnique({
      where: { userId },
    });

    if (!score) {
      score = await this.calculateScore(userId);
    }

    const events = await prisma.trustEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 20,
    });

    return { score, events };
  },
};
