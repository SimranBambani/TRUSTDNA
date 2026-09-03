import crypto from "node:crypto";
import type { KYCProvider } from "./provider.interface";
import type {
  KYCProviderCreateSessionInput,
  KYCProviderCreateSessionResult,
  KYCProviderProcessDocumentInput,
  KYCProviderProcessDocumentResult,
  KYCProviderLivenessInput,
  KYCProviderLivenessResult,
  KYCProviderWebhookVerification,
  KYCProviderStatusResult,
} from "./types";

/**
 * ⚠️ DEVELOPMENT ONLY KYC PROVIDER ADAPTER
 * This adapter simulates identity verification, document OCR, and biometric liveness
 * for local development and integration testing.
 * MUST NEVER BE ENABLED IN PRODUCTION.
 */
export class DevelopmentKYCProvider implements KYCProvider {
  public readonly providerName = "DEVELOPMENT_MOCK_PROVIDER";

  constructor() {
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "CRITICAL SECURITY ALERT: DevelopmentKYCProvider is forbidden in production environments."
      );
    }
  }

  async createVerificationSession(
    _input: KYCProviderCreateSessionInput
  ): Promise<KYCProviderCreateSessionResult> {
    const providerSessionId = `dev_session_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return {
      providerSessionId,
      provider: this.providerName,
      expiresAt,
    };
  }

  async processDocument(
    input: KYCProviderProcessDocumentInput
  ): Promise<KYCProviderProcessDocumentResult> {
    const documentId = `dev_doc_${crypto.randomUUID()}`;

    // Simulate OCR extraction and authenticity validation
    return {
      documentId,
      docType: input.docType,
      isAuthentic: false,
      isExpired: false,
      expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years in future
      issuingCountry: "USA",
      ocrData: {
        extractedFirstName: "Simran",
        extractedLastName: "Architect",
        extractedDob: "1992-05-14",
        extractedNationality: "USA",
        extractedDocumentNumber: `DEV-${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
      mrzData: input.docType === "PASSPORT" ? {
        mrzLine1: "P<USASIMRAN<<ARCHITECT<<<<<<<<<<<<<<<<<<<<<<",
        mrzLine2: "A1234567891USA9205148M3001014<<<<<<<<<<<<<<00",
        isValidMrz: true,
      } : undefined,
      authenticityScore: 0,
    };
  }

  async startLiveness(
    _input: KYCProviderLivenessInput
  ): Promise<KYCProviderLivenessResult> {
    throw new Error("Development KYC provider cannot perform real liveness verification.");
  }

  async getVerificationStatus(providerSessionId: string): Promise<KYCProviderStatusResult> {
    return { status: "PENDING", providerSessionId };
  }

  async getVerificationResult(providerSessionId: string): Promise<KYCProviderStatusResult> {
    return this.getVerificationStatus(providerSessionId);
  }

  async cancelVerification(_providerSessionId: string): Promise<void> {}

  async verifyWebhook(
    headers: Record<string, string>,
    _rawBody: string
  ): Promise<KYCProviderWebhookVerification> {
    const signature = headers["x-dev-signature"] || headers["x-signature"] || headers["x-kyc-signature"];
    const expectedSecret = process.env.KYC_WEBHOOK_SECRET;

    if (signature && expectedSecret && signature === expectedSecret) {
      return {
        isValid: true,
        eventType: "verification.completed",
      };
    }

    return { isValid: false };
  }
}
