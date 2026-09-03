import { prisma } from "@/lib/db";
import { TrustService } from "./trust.service";
import { AuditService } from "./audit.service";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Rule-Based Fraud Detection Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeActivityParams {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  lat?: number;
  lng?: number;
  action: "LOGIN" | "FAILED_LOGIN" | "CREDENTIAL_VERIFY" | "KYC_SUBMIT";
}

export const FraudService = {
  /** Evaluate incoming user action against fraud detection rules */
  async analyzeActivity(params: AnalyzeActivityParams) {
    const { userId, ipAddress, deviceFingerprint, action } = params;
    const now = new Date();

    // ── Rule 2: Login Velocity (>5 attempts in 1 minute) ───────────────────
    if (action === "LOGIN" || action === "FAILED_LOGIN") {
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const recentAttempts = await prisma.session.count({
        where: {
          userId,
          createdAt: { gte: oneMinuteAgo },
        },
      });

      if (recentAttempts >= 5) {
        await this.createFraudAlert({
          userId,
          signalType: "VELOCITY_LOGIN",
          riskScore: 0.75,
          severity: "HIGH",
          evidence: { recentAttempts, windowMs: 60000, ipAddress },
          description: `High login velocity detected (${recentAttempts} attempts in 60 seconds)`,
        });
      }
    }

    // ── Rule 3: Multiple Failed Logins (>10 failed in 15 minutes) ──────────
    if (action === "FAILED_LOGIN") {
      const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const failedCount = await prisma.auditLog.count({
        where: {
          actorId: userId,
          action: "LOGIN_FAILED",
          timestamp: { gte: fifteenMinsAgo },
        },
      });

      if (failedCount >= 10) {
        await this.createFraudAlert({
          userId,
          signalType: "CREDENTIAL_STUFFING",
          riskScore: 0.90,
          severity: "CRITICAL",
          evidence: { failedCount, windowMs: 900000, ipAddress },
          description: `Potential brute-force or credential stuffing attack (${failedCount} failed logins)`,
        });
      }
    }

    // ── Rule 4: Device Mismatch (Unregistered fingerprint) ─────────────────
    if (deviceFingerprint && action === "LOGIN") {
      const existingDevice = await prisma.session.findFirst({
        where: { userId, deviceFingerprint },
      });

      if (!existingDevice) {
        await this.createFraudAlert({
          userId,
          signalType: "DEVICE_MISMATCH",
          riskScore: 0.50,
          severity: "MEDIUM",
          evidence: { deviceFingerprint, ipAddress, userAgent: params.userAgent },
          description: "Unrecognized device login detected",
        });
      }
    }
  },

  /** Persist a Fraud Alert signal and deduct trust penalty */
  async createFraudAlert(params: {
    userId: string;
    signalType: string;
    riskScore: number;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    evidence: Record<string, unknown>;
    description: string;
  }) {
    // Emit Trust Event Penalty (-20 to -90 pts)
    await TrustService.emitTrustEvent({
      userId: params.userId,
      eventType: "LOGIN_ANOMALY",
      category: "FRAUD",
      reason: params.description,
      metadata: params.evidence,
    });

    AuditService.logAsync({
      actorId: params.userId,
      action: "FRAUD_SIGNAL_DETECTED",
      resource: "FraudAlert",
      metadata: { ...params },
    });
  },

  /** Get active fraud alerts for admin review */
  async getOpenAlerts() {
    return await prisma.auditLog.findMany({
      where: { action: "FRAUD_SIGNAL_DETECTED" },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
  },

  /** Get fraud alerts belonging to one authenticated user. */
  async getUserAlerts(userId: string) {
    return await prisma.auditLog.findMany({
      where: { action: "FRAUD_SIGNAL_DETECTED", actorId: userId },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
  },
};
