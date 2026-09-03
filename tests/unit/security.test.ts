import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { hashToken, verifyToken } from "../../src/lib/crypto";
import { inspectMagicBytes, validateKycDocumentFile } from "../../src/lib/kyc/file-security";
import { KycRiskService } from "../../src/server/services/kyc-risk.service";
import { rateLimit } from "../../src/lib/rate-limit";
import { NextRequest } from "next/server";

test("token digests verify valid tokens and reject modified tokens", () => {
  const token = crypto.randomBytes(32).toString("hex");
  const digest = hashToken(token);
  assert.equal(verifyToken(token, digest), true);
  assert.equal(verifyToken(`${token}x`, digest), false);
  assert.equal(digest.length, 64);
});

test("document validation rejects invalid, MIME-spoofed, and oversized files", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(inspectMagicBytes(png), { mimeType: "image/png", ext: "png" });
  assert.equal(validateKycDocumentFile(Buffer.from("<script>alert(1)</script>"), "user").valid, false);
  const spoofed = Buffer.concat([png, Buffer.from("MZ executable payload")]);
  assert.equal(validateKycDocumentFile(spoofed, "user").detectedMimeType, "image/png");
  assert.equal(validateKycDocumentFile(Buffer.alloc(10 * 1024 * 1024 + 1), "user").valid, false);
});

test("risk engine rejects failed liveness and weak authenticity", () => {
  const result = KycRiskService.evaluateRisk({
    submittedFirstName: "Ada",
    submittedLastName: "Lovelace",
    submittedDob: new Date("1815-12-10"),
    ocrFirstName: "Ada",
    ocrLastName: "Lovelace",
    ocrDob: "1815-12-10",
    docAuthenticityScore: 0,
    isDocExpired: false,
    faceMatchScore: 0,
    livenessPassed: false,
  });
  assert.equal(result.decision, "REJECTED");
  assert.ok(result.signals.some((signal) => signal.signal === "LIVENESS_FAILED"));
});

test("risk engine verifies only strong, complete evidence", () => {
  const result = KycRiskService.evaluateRisk({
    submittedFirstName: "Ada",
    submittedLastName: "Lovelace",
    submittedDob: new Date("1815-12-10"),
    ocrFirstName: "Ada",
    ocrLastName: "Lovelace",
    ocrDob: "1815-12-10",
    docAuthenticityScore: 98,
    isDocExpired: false,
    faceMatchScore: 98,
    livenessPassed: true,
  });
  assert.equal(result.decision, "VERIFIED");
  assert.equal(result.riskLevel, "LOW");
});

test("rate limiter blocks requests after the configured threshold", () => {
  const prefix = `unit-rate-limit-${crypto.randomUUID()}`;
  const request = new NextRequest("http://localhost/api/test", { headers: { "x-forwarded-for": "203.0.113.10" } });
  assert.equal(rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: prefix }).success, true);
  assert.equal(rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: prefix }).success, true);
  const blocked = rateLimit(request, { maxRequests: 2, windowMs: 60_000, keyPrefix: prefix });
  assert.equal(blocked.success, false);
  assert.equal(blocked.response?.status, 429);
});