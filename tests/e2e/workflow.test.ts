import { test } from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("E2E workflow requires a real configured environment", { skip: process.env.RUN_E2E_TESTS !== "true" || Boolean(baseUrl && email && password) }, () => {
  assert.fail("Set E2E_BASE_URL, E2E_EMAIL, and E2E_PASSWORD before running the E2E workflow.");
});

test("registration to dashboard workflow uses a real configured environment", { skip: !(baseUrl && email && password) }, async () => {
  let cookie = "";
  const request = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
    return response;
  };

  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName: "E2E", lastName: "Tester" }),
  });
  assert.ok(register.status === 201 || register.status === 409);
  const registration = await register.json() as { error?: string; verificationToken?: string };
  const verificationToken = registration.verificationToken || process.env.E2E_VERIFICATION_TOKEN;
  if (verificationToken) {
    const verification = await request("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: verificationToken }),
    });
    assert.equal(verification.status, 200);
  }

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);

  const start = await request("/api/kyc/start", { method: "POST" });
  assert.equal(start.status, 200);
  const startBody = await start.json() as { data?: { status?: string } };
  assert.ok(startBody.data?.status);

  const personal = await request("/api/kyc/personal-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "E2E", lastName: "Tester", dateOfBirth: "1990-01-01", nationality: "US", countryOfResidence: "US" }),
  });
  assert.equal(personal.status, 200);

  const document = await request("/api/kyc/document/upload", {
    method: "POST",
    body: (() => {
      const form = new FormData();
      form.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "document.png");
      form.append("docType", "PASSPORT");
      return form;
    })(),
  });
  assert.equal(document.status, 200);

  const liveness = await request("/api/kyc/liveness/session", { method: "POST" });
  assert.equal(liveness.status, 200);
  const verification = await request("/api/kyc/submit", { method: "POST" });
  assert.equal(verification.status, 200);
  const verificationBody = await verification.json() as { data?: { decision?: string } };
  assert.ok(["VERIFIED", "REJECTED", "NEEDS_MANUAL_REVIEW"].includes(verificationBody.data?.decision || ""));

  const identity = await request("/api/identity");
  assert.equal(identity.status, 200);
  const trustScore = await request("/api/trust/score");
  assert.equal(trustScore.status, 200);
  const dashboard = await request("/dashboard");
  assert.equal(dashboard.status, 200);
});