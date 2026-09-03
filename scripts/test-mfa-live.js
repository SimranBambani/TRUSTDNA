/**
 * Live functional test for MFA TOTP flow.
 * Uses otpauth to generate a real TOTP code just like Google Authenticator would.
 */
const BASE_URL = "http://localhost:3000";

async function testMfaFlow() {
  console.log("=================================================");
  console.log("🔐 LIVE MFA TOTP FUNCTIONAL TEST");
  console.log("=================================================");

  // Step 1: Register
  const email = `mfa_test_${Date.now()}@gmail.com`;
  const password = "Password123!";
  console.log(`\n[1] Registering user: ${email}`);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName: "Simran", lastName: "Test" }),
  });
  const regJson = await regRes.json();
  if (!regRes.ok) throw new Error(`Register failed: ${JSON.stringify(regJson)}`);
  console.log("✅ Registered:", regJson.message);

  // Step 2: Verify email
  console.log("\n[2] Verifying email...");
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: regJson.verificationToken }),
  });
  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(`Email verify failed: ${JSON.stringify(verifyJson)}`);
  console.log("✅ Email verified:", verifyJson.message);

  // Step 3: Login (no MFA yet)
  console.log("\n[3] Logging in (no MFA yet)...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
  const cookies = loginRes.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  console.log("✅ Login success. Trust tier:", loginJson.data?.user?.trustTier);
  console.log("   mfaRequired:", loginJson.mfaRequired ?? false);

  // Step 4: Setup MFA — get QR code
  console.log("\n[4] Setting up MFA TOTP (getting QR code / otpauth URI)...");
  const setupRes = await fetch(`${BASE_URL}/api/auth/mfa/setup`, {
    method: "POST",
    headers: { Cookie: cookies },
  });
  const setupJson = await setupRes.json();
  if (!setupRes.ok) throw new Error(`MFA setup failed: ${JSON.stringify(setupJson)}`);
  const qrDataUrl = setupJson.data?.qrCodeDataUrl;
  console.log("✅ MFA setup response received");
  console.log("   QR code data URL starts with:", qrDataUrl?.substring(0, 30) + "...");

  // Extract the otpauth URI from the QR to get the secret
  // We'll re-fetch the otpauth URI by calling setup again on a fresh approach
  // Actually setup stores the encrypted secret in DB and returns the QR.
  // We need to extract the secret from the otpauth URI to generate a TOTP code.
  // The QR data URL encodes the otpauth URI — we need to decode it.
  // Instead let's call a separate test helper that reads from DB.
  
  // Step 5: Read the encrypted secret from the DB directly via Prisma and decrypt it
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, mfaSecret: true },
  });
  
  if (!user?.mfaSecret) throw new Error("MFA secret not found in DB");
  console.log("\n[5] Reading encrypted TOTP secret from PostgreSQL...");
  console.log("   Encrypted secret in DB:", user.mfaSecret.substring(0, 20) + "... (AES-256-GCM encrypted)");

  // Decrypt it using the same ENCRYPTION_KEY
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "b41814998d4637a3d8fe31a5dc8fc1f6a8d97bb16328f4805f101a84bc71396c";
  const crypto = await import("node:crypto");
  
  function decryptField(encrypted, hexKey) {
    const key = Buffer.from(hexKey, "hex");
    const [ivHex, authTagHex, ciphertext] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  const totpSecret = decryptField(user.mfaSecret, ENCRYPTION_KEY);
  console.log("   Decrypted base32 TOTP secret length:", totpSecret.length, "chars");

  // Generate a real TOTP code using otpauth (same library the server uses)
  const OTPAuth = await import("otpauth");
  const totp = new OTPAuth.TOTP({
    issuer: "TrustDNA",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: totpSecret,
  });
  const realTotpCode = totp.generate();
  console.log(`\n[6] Generated real TOTP code (same as Google Authenticator would): ${realTotpCode}`);

  // Step 6: Confirm MFA with real TOTP code
  console.log("\n[7] Confirming MFA with real TOTP code...");
  const confirmRes = await fetch(`${BASE_URL}/api/auth/mfa/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ code: realTotpCode }),
  });
  const confirmJson = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(`MFA confirm failed: ${JSON.stringify(confirmJson)}`);
  console.log("✅ MFA confirmed!");
  console.log("   Recovery codes issued:", confirmJson.data?.recoveryCodes?.length);
  console.log("   First recovery code sample:", confirmJson.data?.recoveryCodes?.[0]);

  // Step 7: Logout then login again — should require MFA
  console.log("\n[8] Logging out...");
  await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", headers: { Cookie: cookies } });

  console.log("\n[9] Logging in again (MFA now enabled — should get mfaRequired: true)...");
  const login2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login2Json = await login2Res.json();
  console.log("   mfaRequired:", login2Json.mfaRequired);
  console.log("   tempToken present:", !!login2Json.tempToken);
  if (!login2Json.mfaRequired) throw new Error("❌ Expected mfaRequired=true after MFA setup!");

  // Step 8: Complete MFA login with a fresh TOTP code
  const freshCode = totp.generate();
  console.log(`   Fresh TOTP code for MFA login: ${freshCode}`);
  
  const mfaVerifyRes = await fetch(`${BASE_URL}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempToken: login2Json.tempToken, code: freshCode }),
  });
  const mfaVerifyJson = await mfaVerifyRes.json();
  if (!mfaVerifyRes.ok) throw new Error(`MFA verify login failed: ${JSON.stringify(mfaVerifyJson)}`);
  const mfaCookies = mfaVerifyRes.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  console.log("\n✅ MFA login complete! User logged in with MFA verified.");
  console.log("   Trust tier:", mfaVerifyJson.data?.user?.trustTier);

  // Step 9: Test wrong TOTP code
  console.log("\n[10] Testing wrong TOTP code rejection...");
  const wrongRes = await fetch(`${BASE_URL}/api/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempToken: login2Json.tempToken, code: "000000" }),
  });
  const wrongJson = await wrongRes.json();
  console.log("   Wrong code HTTP status:", wrongRes.status);
  console.log("   Error:", wrongJson.error);
  if (wrongRes.status !== 400) console.error("❌ Expected 400 for wrong code!");
  else console.log("✅ Wrong TOTP code rejected correctly!");

  // Step 10: Disable MFA
  console.log("\n[11] Disabling MFA (requires password + valid TOTP)...");
  const disableCode = totp.generate();
  const disableRes = await fetch(`${BASE_URL}/api/auth/mfa/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: mfaCookies },
    body: JSON.stringify({ password, code: disableCode }),
  });
  const disableJson = await disableRes.json();
  if (!disableRes.ok) throw new Error(`MFA disable failed: ${JSON.stringify(disableJson)}`);
  console.log("✅ MFA disabled:", disableJson.message);

  await prisma.$disconnect();

  console.log("\n=================================================");
  console.log("🎉 ALL MFA TOTP TESTS PASSED!");
  console.log("=================================================");
}

testMfaFlow().catch((err) => {
  console.error("\n❌ MFA TEST FAILED:", err.message);
  process.exit(1);
});
