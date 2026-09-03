import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Audit service — append-only audit log writer
// ─────────────────────────────────────────────────────────────────────────────

interface AuditParams {
  actorId?:       string;
  organizationId?: string;
  sessionId?:     string;
  action:         string;
  resource:       string;
  resourceId?:    string;
  oldValue?:      Record<string, unknown>;
  newValue?:      Record<string, unknown>;
  metadata?:      Record<string, unknown>;
  ipAddress?:     string;
  userAgent?:     string;
  requestId?:     string;
  isSuccess?:     boolean;
  errorMessage?:  string;
  durationMs?:    number;
}

export const AuditService = {
  async log(params: AuditParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId:        params.actorId,
        organizationId: params.organizationId,
        sessionId:      params.sessionId,
        action:         params.action,
        resource:       params.resource,
        resourceId:     params.resourceId,
        oldValue:       params.oldValue as Prisma.InputJsonValue,
        newValue:       params.newValue as Prisma.InputJsonValue,
        metadata:       params.metadata as Prisma.InputJsonValue,
        ipAddress:      params.ipAddress,
        userAgent:      params.userAgent,
        requestId:      params.requestId,
        isSuccess:      params.isSuccess ?? true,
        errorMessage:   params.errorMessage,
        durationMs:     params.durationMs,
        timestamp:      new Date(),
      },
    });
  },

  async logAsync(params: AuditParams): Promise<void> {
    // Fire-and-forget — does not block the response
    this.log(params).catch((err) =>
      console.error("[AuditService] Failed to write audit log:", err)
    );
  },
};
