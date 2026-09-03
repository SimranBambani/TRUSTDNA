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

export interface KYCProvider {
  providerName: string;

  /** Initialize a verification session with provider */
  createVerificationSession(
    input: KYCProviderCreateSessionInput
  ): Promise<KYCProviderCreateSessionResult>;

  /** Send document payload to provider for classification, OCR, and authenticity verification */
  processDocument(
    input: KYCProviderProcessDocumentInput
  ): Promise<KYCProviderProcessDocumentResult>;

  getVerificationStatus(providerSessionId: string): Promise<KYCProviderStatusResult>;

  /** Initiate biometric liveness session with provider */
  startLiveness(
    input: KYCProviderLivenessInput
  ): Promise<KYCProviderLivenessResult>;

  /** Verify cryptographic signature of incoming provider webhook callback */
  verifyWebhook(
    headers: Record<string, string>,
    rawBody: string
  ): Promise<KYCProviderWebhookVerification>;

  getVerificationResult(providerSessionId: string): Promise<KYCProviderStatusResult>;

  cancelVerification(providerSessionId: string): Promise<void>;
}

export type IKYCProvider = KYCProvider;
