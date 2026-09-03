import type { KYCRiskLevel, KYCDecision } from "@prisma/client";

export interface KycRiskAssessmentInput {
  submittedFirstName: string;
  submittedLastName: string;
  submittedDob: Date;
  ocrFirstName?: string;
  ocrLastName?: string;
  ocrDob?: string;
  docAuthenticityScore: number; // 0-100
  isDocExpired: boolean;
  faceMatchScore: number; // 0-100
  livenessPassed: boolean;
  velocityCount?: number;
}

export interface KycRiskEvaluationResult {
  riskScore: number; // 0 to 100
  riskLevel: KYCRiskLevel;
  decision: KYCDecision;
  nameMatchScore: number;
  dobMatchScore: number;
  docAuthenticityScore: number;
  faceMatchScore: number;
  livenessPassed: boolean;
  decisionReason: string;
  signals: Array<{ signal: string; weight: number; description: string }>;
}

export const KycRiskService = {
  /** Calculate fuzzy string similarity (Levenshtein ratio) for names */
  calculateNameMatch(a: string, b: string): number {
    if (!a || !b) return 0;
    const cleanA = a.trim().toLowerCase();
    const cleanB = b.trim().toLowerCase();
    if (cleanA === cleanB) return 100;
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 85;

    // Simple edit distance ratio
    const len = Math.max(cleanA.length, cleanB.length);
    let diff = 0;
    for (let i = 0; i < len; i++) {
      if (cleanA[i] !== cleanB[i]) diff++;
    }
    const score = Math.max(0, Math.round(((len - diff) / len) * 100));
    return score;
  },

  /** Evaluate full KYC risk signals and produce server-side decision */
  evaluateRisk(input: KycRiskAssessmentInput): KycRiskEvaluationResult {
    const signals: Array<{ signal: string; weight: number; description: string }> = [];

    // 1. Name match comparison
    const firstNameScore = this.calculateNameMatch(
      input.submittedFirstName,
      input.ocrFirstName || input.submittedFirstName
    );
    const lastNameScore = this.calculateNameMatch(
      input.submittedLastName,
      input.ocrLastName || input.submittedLastName
    );
    const nameMatchScore = Math.round((firstNameScore + lastNameScore) / 2);

    if (nameMatchScore < 70) {
      signals.push({
        signal: "NAME_DISCREPANCY",
        weight: 30,
        description: `Submitted name (${input.submittedFirstName} ${input.submittedLastName}) differs from document OCR (${input.ocrFirstName} ${input.ocrLastName})`,
      });
    }

    // 2. DOB match comparison
    let dobMatchScore = 100;
    if (input.ocrDob) {
      const submittedDobStr = input.submittedDob.toISOString().split("T")[0];
      if (submittedDobStr !== input.ocrDob) {
        dobMatchScore = 40;
        signals.push({
          signal: "DOB_DISCREPANCY",
          weight: 40,
          description: `Date of birth mismatch: submitted (${submittedDobStr}) vs OCR (${input.ocrDob})`,
        });
      }
    }

    // 3. Document authenticity check
    if (input.docAuthenticityScore < 70) {
      signals.push({
        signal: "LOW_DOC_AUTHENTICITY",
        weight: 50,
        description: `Document authenticity score is low (${input.docAuthenticityScore}/100)`,
      });
    }

    // 4. Document expiry check
    if (input.isDocExpired) {
      signals.push({
        signal: "EXPIRED_DOCUMENT",
        weight: 60,
        description: "Uploaded identity document is expired",
      });
    }

    // 5. Face match check
    if (input.faceMatchScore < 80) {
      signals.push({
        signal: "FACE_MISMATCH",
        weight: 45,
        description: `Facial biometric match score is below minimum threshold (${input.faceMatchScore}/100)`,
      });
    }

    // 6. Liveness check
    if (!input.livenessPassed) {
      signals.push({
        signal: "LIVENESS_FAILED",
        weight: 70,
        description: "Biometric liveness verification failed or was bypassed",
      });
    }

    // 7. Velocity check
    if (input.velocityCount && input.velocityCount > 3) {
      signals.push({
        signal: "EXCESSIVE_VERIFICATION_ATTEMPTS",
        weight: 25,
        description: `User attempted verification ${input.velocityCount} times in short duration`,
      });
    }

    // Calculate aggregated Risk Score (0 = lowest risk, 100 = highest risk)
    let riskScore = 0;
    for (const sig of signals) {
      riskScore += sig.weight;
    }
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine Risk Level
    let riskLevel: KYCRiskLevel = "LOW";
    if (riskScore >= 75) riskLevel = "CRITICAL";
    else if (riskScore >= 50) riskLevel = "HIGH";
    else if (riskScore >= 25) riskLevel = "MEDIUM";

    // Determine Automated Decision
    let decision: KYCDecision = "VERIFIED";
    let decisionReason = "Automated verification passed all security checks.";

    if (!input.livenessPassed || input.isDocExpired || input.docAuthenticityScore < 50 || riskScore >= 75) {
      decision = "REJECTED";
      decisionReason = "Verification failed mandatory security requirements (liveness, document authenticity, or expiry).";
    } else if (riskScore >= 25 || nameMatchScore < 85 || dobMatchScore < 100) {
      decision = "NEEDS_MANUAL_REVIEW";
      decisionReason = "Verification flagged ambiguous signals and requires manual reviewer inspection.";
    }

    return {
      riskScore,
      riskLevel,
      decision,
      nameMatchScore,
      dobMatchScore,
      docAuthenticityScore: input.docAuthenticityScore,
      faceMatchScore: input.faceMatchScore,
      livenessPassed: input.livenessPassed,
      decisionReason,
      signals,
    };
  },
};
