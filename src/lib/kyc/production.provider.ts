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

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

export class ProductionKYCProvider implements KYCProvider {
  public readonly providerName: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor(provider: "ONFIDO" | "PERSONA") {
    this.providerName = provider;
    const prefix = provider === "ONFIDO" ? "ONFIDO" : "PERSONA";
    this.apiKey = process.env[`${prefix}_API_TOKEN`] || process.env[`${prefix}_API_KEY`] || "";
    this.webhookSecret = process.env[`${prefix}_WEBHOOK_SECRET`] || "";
    this.baseUrl = process.env[`${prefix}_BASE_URL`] || "";
    if (!this.apiKey || !this.webhookSecret || !this.baseUrl) {
      throw new Error(`${provider} KYC configuration requires API credentials, webhook secret, and base URL.`);
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
          ...init,
          signal: controller.signal,
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", ...init.headers },
        });
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          if (response.status >= 500 && attempt < MAX_RETRIES) throw new Error(`Provider server error ${response.status}`);
          throw new Error(`KYC provider request failed (${response.status}): ${body.slice(0, 200)}`);
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (attempt === MAX_RETRIES) break;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`KYC provider unavailable: ${lastError instanceof Error ? lastError.message : "request failed"}`);
  }

  createVerificationSession(input: KYCProviderCreateSessionInput) {
    return this.request<KYCProviderCreateSessionResult>("verification-sessions", { method: "POST", body: JSON.stringify(input) });
  }

  processDocument(input: KYCProviderProcessDocumentInput) {
    return this.request<KYCProviderProcessDocumentResult>(`verification-sessions/${input.providerSessionId}/documents`, {
      method: "POST",
      body: JSON.stringify({ ...input, fileBuffer: input.fileBuffer.toString("base64") }),
    });
  }

  getVerificationStatus(providerSessionId: string) {
    return this.request<KYCProviderStatusResult>(`verification-sessions/${providerSessionId}`);
  }

  startLiveness(input: KYCProviderLivenessInput) {
    return this.request<KYCProviderLivenessResult>(`verification-sessions/${input.providerSessionId}/liveness`, {
      method: "POST", body: JSON.stringify(input),
    });
  }

  getVerificationResult(providerSessionId: string) {
    return this.request<KYCProviderStatusResult>(`verification-sessions/${providerSessionId}/result`);
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string): Promise<KYCProviderWebhookVerification> {
    const signature = headers["x-kyc-signature"] || headers["x-signature"];
    const timestamp = headers["x-kyc-timestamp"];
    const eventId = headers["x-kyc-event-id"];
    const timestampNumber = Number(timestamp);
    if (!signature || !timestamp || !eventId || !Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber * 1000) > 5 * 60 * 1000) return { isValid: false };
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const actual = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return { isValid: false };
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(rawBody) as Record<string, unknown>; } catch { return { isValid: false }; }
    return { isValid: true, eventId, eventType: String(payload.type || ""), providerSessionId: String(payload.providerSessionId || ""), payload };
  }

  cancelVerification(providerSessionId: string) {
    return this.request<void>(`verification-sessions/${providerSessionId}`, { method: "DELETE" });
  }
}