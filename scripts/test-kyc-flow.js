const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

// Helper to create a valid minimal PNG buffer with correct magic bytes
function createSamplePngBuffer() {
  // Minimal valid PNG file binary (67 bytes)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
}

async function runKycEndToEndTest() {
  console.log("=================================================");
  console.log("🚀 STARTING AUTOMATED KYC END-TO-END VERIFICATION");
  console.log("=================================================");

  const email = `kyctest_${Date.now()}@gmail.com`; // Real domain for DNS MX check
  const password = "Password123!";
  let cookies = "";

  // Step A: Register Test User
  console.log(`\n[1/7] Registering test user (${email})...`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      firstName: "Simran",
      lastName: "Architect",
    }),
  });

  const regJson = await regRes.json();
  console.log("Register Response Status:", regRes.status, regJson.message);

  if (!regRes.ok || !regJson.verificationToken) {
    throw new Error(`Registration failed: ${regJson.error || JSON.stringify(regJson)}`);
  }

  // Step B: Verify Email Address
  console.log("\n[2/7] Verifying user email address...");
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: regJson.verificationToken }),
  });
  const verifyJson = await verifyRes.json();
  console.log("Verify Email Status:", verifyRes.status, verifyJson.message);

  // Step C: Login User & Extract Session Cookie
  console.log("\n[3/7] Logging in user to obtain session cookies...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    const loginJson = await loginRes.json();
    throw new Error(`Login failed: ${loginJson.error}`);
  }

  const rawCookies = loginRes.headers.getSetCookie();
  cookies = rawCookies.map(c => c.split(";")[0]).join("; ");
  console.log("Session Cookie Established:", cookies.length > 0 ? "YES" : "NO");

  // Step 1: Start KYC Session
  console.log("\n[4/7] Calling /api/kyc/start...");
  const startRes = await fetch(`${BASE_URL}/api/kyc/start`, {
    method: "POST",
    headers: { Cookie: cookies },
  });
  const startJson = await startRes.json();
  console.log("KYC Start Status:", startRes.status, "State:", startJson.data?.status);

  // Step 2: Submit Personal Identity Information
  console.log("\n[5/7] Submitting Step 1: Personal Info...");
  const personalRes = await fetch(`${BASE_URL}/api/kyc/personal-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      firstName: "Simran",
      lastName: "Architect",
      dateOfBirth: "1992-05-14",
      nationality: "US",
      countryOfResidence: "US",
    }),
  });
  const personalJson = await personalRes.json();
  console.log("Personal Info Status:", personalRes.status, "New State:", personalJson.data?.status);

  // Step 3: Upload Identity Document with PNG magic bytes
  console.log("\n[6/7] Submitting Step 2: Upload Passport Document (PNG Magic Bytes)...");
  const samplePng = createSamplePngBuffer();

  const formData = new FormData();
  const blob = new Blob([samplePng], { type: "image/png" });
  formData.append("file", blob, "passport_scan.png");
  formData.append("docType", "PASSPORT");

  const docRes = await fetch(`${BASE_URL}/api/kyc/document/upload`, {
    method: "POST",
    headers: { Cookie: cookies },
    body: formData,
  });
  const docJson = await docRes.json();
  console.log("Document Upload Status:", docRes.status, "New State:", docJson.data?.status);

  // Step 4: Complete Biometric Liveness Check
  console.log("\n[7/7] Submitting Step 3: Biometric Liveness Check...");
  const livenessRes = await fetch(`${BASE_URL}/api/kyc/liveness/session`, {
    method: "POST",
    headers: { Cookie: cookies },
  });
  const livenessJson = await livenessRes.json();
  console.log("Liveness Session Status:", livenessRes.status, "Liveness Passed:", livenessJson.data?.livenessPassed);

  // Step 5: Execute Automated Decision Engine
  console.log("\n[FINAL] Executing Server-Side Automated Decision Engine (/api/kyc/submit)...");
  const submitRes = await fetch(`${BASE_URL}/api/kyc/submit`, {
    method: "POST",
    headers: { Cookie: cookies },
  });
  const submitJson = await submitRes.json();
  console.log("\n=================================================");
  console.log("🎉 FINAL KYC DECISION RESULT:");
  console.log("HTTP Status:", submitRes.status);
  console.log("KYC Status:", submitJson.data?.status);
  console.log("Decision:", submitJson.data?.decision);
  console.log("Risk Score:", submitJson.data?.riskScore);
  console.log("Risk Level:", submitJson.data?.riskLevel);
  console.log("Reason:", submitJson.data?.decisionReason);
  console.log("=================================================");

  if (submitRes.status === 200 && submitJson.data?.status === "VERIFIED") {
    console.log("\n✅ END-TO-END KYC VERIFICATION FLOW PASSED PERFECTLY!");
  } else {
    console.error("\n❌ KYC Verification decision failed:", submitJson);
    process.exit(1);
  }
}

runKycEndToEndTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
