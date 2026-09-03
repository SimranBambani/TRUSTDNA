import { prisma } from "@/lib/db";
import { getKycProvider } from "@/lib/kyc/provider.factory";
import { validateKycDocumentFile } from "@/lib/kyc/file-security";
import { KycRiskService } from "./kyc-risk.service";
import { TrustService } from "./trust.service";
import { AuditService } from "./audit.service";
import { logSecurityEvent } from "@/lib/logger";
import type { KYCDocumentType } from "@prisma/client";

export interface SubmitPersonalInfoParams {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  countryOfResidence: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UploadDocumentParams {
  userId: string;
  docType: KYCDocumentType;
  fileBuffer: Buffer;
  ipAddress?: string;
  userAgent?: string;
}

export interface StartLivenessParams {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubmitKycDecisionParams {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export function toSafeKycResponse(kyc: {
  id: string;
  status: string;
  currentStep: number;
  decision: string;
  startedAt: Date;
  completedAt: Date | null;
  personalIdentity?: unknown;
  documents?: unknown[];
  livenessSessions?: unknown[];
}) {
  return {
    id: kyc.id,
    status: kyc.status,
    currentStep: kyc.currentStep,
    decision: kyc.decision,
    startedAt: kyc.startedAt,
    completedAt: kyc.completedAt,
    documentsCount: kyc.documents?.length || 0,
    hasLivenessCompleted: (kyc.livenessSessions?.length || 0) > 0,
  };
}

export const KycService = {
  /** 1. Start or resume KYC verification session */
  async getOrCreateKycSession(userId: string) {
    let kyc = await prisma.kYCVerification.findFirst({
      where: { userId },
      include: {
        personalIdentity: true,
        documents: true,
        livenessSessions: true,
        riskEngine: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!kyc || kyc.status === "EXPIRED") {
      const provider = getKycProvider();
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found");

      const providerSession = await provider.createVerificationSession({
        userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      kyc = await prisma.kYCVerification.create({
        data: {
          userId,
          status: "KYC_STARTED",
          currentStep: 1,
          provider: providerSession.provider,
          providerSessionId: providerSession.providerSessionId,
          expiresAt: providerSession.expiresAt,
        },
        include: {
          personalIdentity: true,
          documents: true,
          livenessSessions: true,
          riskEngine: true,
        },
      });

      await this.logKycAudit(kyc.id, userId, "KYC_STARTED", "SUCCESS");
    }

    return kyc;
  },

  /** Helper to assert session is active and not terminal */
  assertActiveState(kyc: { status: string }) {
    if (["VERIFIED", "REJECTED", "NEEDS_MANUAL_REVIEW"].includes(kyc.status)) {
      throw new Error(`KYC verification session is already in terminal state (${kyc.status}) and cannot be modified.`);
    }
  },

  /** 2. Step 1: Submit Personal Identity details */
  async submitPersonalInfo(params: SubmitPersonalInfoParams) {
    const kyc = await this.getOrCreateKycSession(params.userId);
    this.assertActiveState(kyc);

    // Validate Date of Birth
    const dob = new Date(params.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new Error("Invalid date of birth format.");
    }
    if (dob > new Date()) {
      throw new Error("Date of birth cannot be in the future.");
    }

    // Age validation (minimum 18 years)
    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears < 18) {
      throw new Error("You must be at least 18 years of age to complete identity verification.");
    }
    if (ageYears > 120) {
      throw new Error("Invalid date of birth.");
    }

    const cleanFirstName = params.firstName.trim();
    const cleanLastName = params.lastName.trim();
    const cleanNationality = params.nationality.toUpperCase().trim();
    const cleanCountry = params.countryOfResidence.toUpperCase().trim();

    // Upsert PersonalIdentity record
    await prisma.personalIdentity.upsert({
      where: { kycVerificationId: kyc.id },
      create: {
        kycVerificationId: kyc.id,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        dateOfBirth: dob,
        nationality: cleanNationality,
        countryOfResidence: cleanCountry,
      },
      update: {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        dateOfBirth: dob,
        nationality: cleanNationality,
        countryOfResidence: cleanCountry,
      },
    });

    // Advance state machine to PERSONAL_INFO_COMPLETED & currentStep 2
    const updatedKyc = await prisma.kYCVerification.update({
      where: { id: kyc.id },
      data: {
        status: "PERSONAL_INFO_COMPLETED",
        currentStep: 2,
      },
      include: { personalIdentity: true, documents: true },
    });

    await this.logKycAudit(
      kyc.id,
      params.userId,
      "PERSONAL_INFO_SUBMITTED",
      "SUCCESS",
      { nationality: cleanNationality, country: cleanCountry },
      params.ipAddress,
      params.userAgent
    );

    return updatedKyc;
  },

  /** 3. Step 2: Upload Identity Document with magic byte inspection */
  async uploadDocument(params: UploadDocumentParams) {
    const kyc = await this.getOrCreateKycSession(params.userId);
    this.assertActiveState(kyc);

    if (!kyc.personalIdentity) {
      throw new Error("Step 1 incomplete: Personal identity details must be submitted before uploading documents.");
    }

    // Perform magic byte file security inspection
    const fileSecurity = validateKycDocumentFile(params.fileBuffer, params.userId);
    if (!fileSecurity.valid) {
      await this.logKycAudit(
        kyc.id,
        params.userId,
        "DOCUMENT_SECURITY_SCAN",
        "FAILED",
        { error: fileSecurity.error },
        params.ipAddress,
        params.userAgent
      );
      throw new Error(fileSecurity.error || "Document file security check failed.");
    }

    const provider = getKycProvider();
    const providerSessionId = kyc.providerSessionId || `dev_session_${kyc.id}`;

    // Send document payload to provider abstraction for OCR & classification
    const providerResult = await provider.processDocument({
      providerSessionId,
      docType: params.docType,
      fileBuffer: params.fileBuffer,
      mimeType: fileSecurity.detectedMimeType,
      fileHash: fileSecurity.fileHash,
    });

    // Save KYCDocument in database
    const doc = await prisma.kYCDocument.create({
      data: {
        kycVerificationId: kyc.id,
        docType: params.docType,
        storagePath: fileSecurity.secureStoragePath,
        fileHash: fileSecurity.fileHash,
        mimeType: fileSecurity.detectedMimeType,
        fileSizeBytes: fileSecurity.fileSizeBytes,
        magicBytesVerified: true,
        scanStatus: "SECURITY_SCAN_PASSED",
        ocrData: providerResult.ocrData as any,
        mrzData: providerResult.mrzData as any,
        expiryDate: providerResult.expiryDate,
        issuingCountry: providerResult.issuingCountry,
        isExpired: providerResult.isExpired,
        authenticityScore: providerResult.authenticityScore,
        processedAt: new Date(),
      },
    });

    // Advance state machine to DOCUMENT_UPLOADED & currentStep 3
    const updatedKyc = await prisma.kYCVerification.update({
      where: { id: kyc.id },
      data: {
        status: "DOCUMENT_UPLOADED",
        currentStep: 3,
      },
      include: { personalIdentity: true, documents: true },
    });

    await this.logKycAudit(
      kyc.id,
      params.userId,
      "DOCUMENT_UPLOADED",
      "SUCCESS",
      { documentId: doc.id, docType: params.docType, fileHash: fileSecurity.fileHash },
      params.ipAddress,
      params.userAgent
    );

    return updatedKyc;
  },

  /** 4. Step 3: Initiate Biometric Liveness Session */
  async startLivenessSession(params: StartLivenessParams) {
    const kyc = await this.getOrCreateKycSession(params.userId);
    this.assertActiveState(kyc);

    if (!kyc.documents || kyc.documents.length === 0) {
      throw new Error("Step 2 incomplete: Identity document must be uploaded before liveness check.");
    }

    const provider = getKycProvider();
    const providerSessionId = kyc.providerSessionId || `dev_session_${kyc.id}`;

    const livenessResult = await provider.startLiveness({
      providerSessionId,
    });

    const livenessSession = await prisma.livenessSession.create({
      data: {
        kycVerificationId: kyc.id,
        sessionToken: livenessResult.livenessSessionToken,
        providerSessionId,
        status: "COMPLETED",
        livenessPassed: livenessResult.livenessPassed,
        livenessScore: livenessResult.livenessScore,
        faceMatchPassed: livenessResult.faceMatchPassed,
        faceMatchScore: livenessResult.faceMatchScore,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        completedAt: new Date(),
      },
    });

    await prisma.kYCVerification.update({
      where: { id: kyc.id },
      data: {
        status: "LIVENESS_PENDING",
      },
    });

    await this.logKycAudit(
      kyc.id,
      params.userId,
      "LIVENESS_COMPLETED",
      "SUCCESS",
      { livenessPassed: livenessResult.livenessPassed, livenessScore: livenessResult.livenessScore },
      params.ipAddress,
      params.userAgent
    );

    return livenessSession;
  },

  /** 5. Trigger Automated Risk Engine & Final KYC Decision */
  async submitKycDecision(params: SubmitKycDecisionParams) {
    const kyc = await this.getOrCreateKycSession(params.userId);
    this.assertActiveState(kyc);

    if (!kyc.personalIdentity) {
      throw new Error("Personal identity details missing. Please complete Step 1.");
    }
    if (!kyc.documents || kyc.documents.length === 0) {
      throw new Error("Identity document missing. Please complete Step 2.");
    }
    if (!kyc.livenessSessions || kyc.livenessSessions.length === 0) {
      throw new Error("Biometric liveness check missing. Please complete Step 3.");
    }

    const latestDoc = kyc.documents[kyc.documents.length - 1];
    const latestLiveness = kyc.livenessSessions[kyc.livenessSessions.length - 1];
    const ocrData = (latestDoc.ocrData as any) || {};

    // Execute server-side automated risk engine
    const evaluation = KycRiskService.evaluateRisk({
      submittedFirstName: kyc.personalIdentity.firstName,
      submittedLastName: kyc.personalIdentity.lastName,
      submittedDob: kyc.personalIdentity.dateOfBirth,
      ocrFirstName: ocrData.extractedFirstName,
      ocrLastName: ocrData.extractedLastName,
      ocrDob: ocrData.extractedDob,
      docAuthenticityScore: latestDoc.authenticityScore ?? 0,
      isDocExpired: latestDoc.isExpired,
      faceMatchScore: latestLiveness.faceMatchScore || 95,
      livenessPassed: latestLiveness.livenessPassed,
    });

    // Save Risk Engine evaluation record
    await prisma.kYCRiskEngine.upsert({
      where: { kycVerificationId: kyc.id },
      create: {
        kycVerificationId: kyc.id,
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        nameMatchScore: evaluation.nameMatchScore,
        dobMatchScore: evaluation.dobMatchScore,
        docAuthenticityScore: evaluation.docAuthenticityScore,
        faceMatchScore: evaluation.faceMatchScore,
        livenessPassed: evaluation.livenessPassed,
        signals: evaluation.signals as any,
      },
      update: {
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        nameMatchScore: evaluation.nameMatchScore,
        dobMatchScore: evaluation.dobMatchScore,
        docAuthenticityScore: evaluation.docAuthenticityScore,
        faceMatchScore: evaluation.faceMatchScore,
        livenessPassed: evaluation.livenessPassed,
        signals: evaluation.signals as any,
        evaluatedAt: new Date(),
      },
    });

    // Update KYC state machine with final decision
    const isDevelopmentProvider = kyc.provider === "DEVELOPMENT_MOCK_PROVIDER" || kyc.provider === "DEVELOPMENT";
    const finalDecision = isDevelopmentProvider ? "NEEDS_MANUAL_REVIEW" : evaluation.decision;
    const finalKycStatus =
      finalDecision === "VERIFIED"
        ? "VERIFIED"
        : finalDecision === "REJECTED"
        ? "REJECTED"
        : "NEEDS_MANUAL_REVIEW";

    const updatedKyc = await prisma.kYCVerification.update({
      where: { id: kyc.id },
      data: {
        status: finalKycStatus,
        decision: finalDecision,
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        decisionReason: evaluation.decisionReason,
        completedAt: new Date(),
      },
      include: {
        personalIdentity: true,
        documents: true,
        livenessSessions: true,
        riskEngine: true,
      },
    });

    // If verified, update User status to ACTIVE and emit Trust Event (+200 pts)
    if (finalDecision === "VERIFIED") {
      await prisma.user.update({
        where: { id: params.userId },
        data: { status: "ACTIVE" },
      });

      await TrustService.emitTrustEvent({
        userId: params.userId,
        eventType: "KYC_VERIFIED",
        category: "IDENTITY",
        reason: "Automated KYC Verification completed successfully",
        sourceEntityId: kyc.id,
        sourceEntityType: "KYCVerification",
      });
    }

    await this.logKycAudit(
      kyc.id,
      params.userId,
      "VERIFICATION_COMPLETED",
      finalDecision,
      { riskScore: evaluation.riskScore, riskLevel: evaluation.riskLevel, reason: evaluation.decisionReason },
      params.ipAddress,
      params.userAgent
    );

    return updatedKyc;
  },

  /** Helper to record append-only audit trail */
  async logKycAudit(
    kycVerificationId: string,
    userId: string,
    event: string,
    outcome: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    await prisma.kYCAuditLog.create({
      data: {
        kycVerificationId,
        userId,
        event,
        outcome,
        metadata: metadata || {},
        ipAddress,
        userAgent,
      },
    });

    AuditService.logAsync({
      actorId: userId,
      action: event,
      resource: "KYCVerification",
      resourceId: kycVerificationId,
      metadata,
      ipAddress,
      userAgent,
    });

    logSecurityEvent({
      action: event,
      actorId: userId,
      ipAddress,
      userAgent,
      status: outcome === "SUCCESS" ? "SUCCESS" : "FAILURE",
    });
  },
};
