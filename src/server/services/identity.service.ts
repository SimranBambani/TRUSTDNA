import { prisma } from "@/lib/db";
import { TrustService } from "./trust.service";
import { AuditService } from "./audit.service";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Identity & KYC Service
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitKycParams {
  userId: string;
  requestType: string;
  provider: "INTERNAL" | "ONFIDO" | "JUMIO" | "PERSONA";
  documents?: {
    docType: "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE";
    storagePath: string;
    fileSizeBytes: number;
    mimeType: string;
  }[];
}

export const IdentityService = {
  /** Submit KYC request and documents */
  async submitKyc(params: SubmitKycParams) {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new Error("User not found");

    // Create VerificationRequest in DB
    const request = await prisma.verificationRequest.create({
      data: {
        requesterId: params.userId,
        subjectUserId: params.userId,
        requestType: params.requestType,
        status: "APPROVED", // Auto-approved in dev workflow
        kycProvider: params.provider,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    // Save document metadata if provided
    if (params.documents && params.documents.length > 0) {
      for (const doc of params.documents) {
        await prisma.verificationDocument.create({
          data: {
            verificationRequestId: request.id,
            docType: doc.docType,
            storagePath: doc.storagePath,
            storageProvider: "supabase",
            mimeType: doc.mimeType,
            fileSizeBytes: doc.fileSizeBytes,
            status: "VERIFIED",
            processedAt: new Date(),
          },
        });
      }
    }

    // Update user status
    await prisma.user.update({
      where: { id: params.userId },
      data: { status: "ACTIVE" },
    });

    // Emit KYC_VERIFIED Trust Event (+200 pts)
    await TrustService.emitTrustEvent({
      userId: params.userId,
      eventType: "KYC_VERIFIED",
      category: "IDENTITY",
      reason: `${params.requestType} verified via ${params.provider}`,
      sourceEntityId: request.id,
      sourceEntityType: "VerificationRequest",
    });

    AuditService.logAsync({
      actorId: params.userId,
      action: "KYC_SUBMITTED",
      resource: "VerificationRequest",
      resourceId: request.id,
    });

    return request;
  },

  /** Fetch user identity profile and verification status */
  async getIdentityProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    if (!user) throw new Error("User not found");

    const requests = await prisma.verificationRequest.findMany({
      where: { subjectUserId: userId },
      include: { documents: true },
      orderBy: { submittedAt: "desc" },
    });

    return { user, verificationRequests: requests };
  },
};
