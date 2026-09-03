export interface KYCProviderCreateSessionInput {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface KYCProviderCreateSessionResult {
  providerSessionId: string;
  provider: string;
  expiresAt: Date;
}

export interface KYCProviderProcessDocumentInput {
  providerSessionId: string;
  docType: "PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE";
  fileBuffer: Buffer;
  mimeType: string;
  fileHash: string;
}

export interface KYCProviderProcessDocumentResult {
  documentId: string;
  docType: string;
  isAuthentic: boolean;
  isExpired: boolean;
  expiryDate?: Date;
  issuingCountry?: string;
  ocrData: {
    extractedFirstName?: string;
    extractedLastName?: string;
    extractedDob?: string;
    extractedNationality?: string;
    extractedDocumentNumber?: string;
  };
  mrzData?: {
    mrzLine1?: string;
    mrzLine2?: string;
    isValidMrz?: boolean;
  };
  authenticityScore: number; // 0 - 100
}

export interface KYCProviderLivenessInput {
  providerSessionId: string;
}

export interface KYCProviderLivenessResult {
  livenessSessionToken: string;
  livenessPassed: boolean;
  livenessScore: number; // 0 - 100
  faceMatchPassed: boolean;
  faceMatchScore: number; // 0 - 100
}

export interface KYCProviderWebhookVerification {
  isValid: boolean;
  eventId?: string;
  eventType?: string;
  providerSessionId?: string;
  payload?: Record<string, unknown>;
}

export interface KYCProviderStatusResult {
  status: "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_MANUAL_REVIEW";
  providerSessionId: string;
  result?: KYCProviderResult;
}

export interface KYCProviderResult {
  isAuthentic: boolean;
  isExpired: boolean;
  expiryDate?: Date;
  issuingCountry?: string;
  ocrData?: KYCProviderProcessDocumentResult["ocrData"];
  authenticityScore?: number;
  livenessPassed?: boolean;
  livenessScore?: number;
  faceMatchPassed?: boolean;
  faceMatchScore?: number;
  identityMatchPassed?: boolean;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}
