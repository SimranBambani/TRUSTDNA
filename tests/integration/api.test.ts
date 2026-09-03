import { test } from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL;

test("API integration environment is explicit", { skip: !baseUrl }, async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
});

test("unauthenticated protected APIs reject access", { skip: !baseUrl }, async () => {
  const endpoints = ["/api/identity", "/api/credentials", "/api/org/api-keys", "/api/kyc/status"];
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    assert.equal(response.status, 401, endpoint);
  }
});

test("public credential verification rejects missing and malformed credentials", { skip: !baseUrl }, async () => {
  assert.equal((await fetch(`${baseUrl}/api/credentials/verify`)).status, 400);
  const response = await fetch(`${baseUrl}/api/credentials/verify?token=not-a-jwt`);
  assert.equal(response.status, 200);
  const body = await response.json() as { valid: boolean };
  assert.equal(body.valid, false);
});

test("public credential key discovery exposes public keys only", { skip: !baseUrl }, async () => {
  const response = await fetch(`${baseUrl}/api/credentials/keys`);
  assert.ok([200, 503].includes(response.status));
  if (response.status === 200) {
    const body = await response.json() as { keys: Array<Record<string, unknown>> };
    assert.ok(body.keys.length > 0);
    assert.equal(body.keys.some((key) => "d" in key || "privateKey" in key), false);
  }
});

test("integration suite requires TEST_BASE_URL when explicitly enabled", { skip: process.env.RUN_INTEGRATION_TESTS !== "true" || Boolean(baseUrl) }, () => {
  assert.fail("Set TEST_BASE_URL to a running TrustDNA instance before running integration tests.");
});