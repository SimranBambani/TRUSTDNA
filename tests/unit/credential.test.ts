import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { signCredentialJwt, verifyCredentialJwt } from "../../src/lib/jwt";

async function configureKeys(keyId = "unit-key-v1") {
  const pair = crypto.generateKeyPairSync("ed25519");
  process.env.JWT_SECRET = "unit-test-session-secret-long-enough";
  process.env.VC_ISSUER_PRIVATE_KEY = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  process.env.VC_ISSUER_PUBLIC_KEY = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  process.env.VC_ISSUER_KEY_ID = keyId;
  delete process.env.VC_ISSUER_PUBLIC_KEYS;
}

test("valid credential signatures verify with the issuer public key", async () => {
  await configureKeys();
  const token = await signCredentialJwt({ issuer: { id: "did:trustdna:org:test" }, credentialSubject: { id: "did:trustdna:user:test" } });
  const result = await verifyCredentialJwt(token);
  assert.equal(result.valid, true);
});

test("modified credentials and unknown key IDs are rejected", async () => {
  await configureKeys();
  const token = await signCredentialJwt({ credentialSubject: { name: "original" } });
  const parts = token.split(".");
  const modified = `${parts[0]}.${Buffer.from(JSON.stringify({ credentialSubject: { name: "modified" } })).toString("base64url")}.${parts[2]}`;
  assert.equal((await verifyCredentialJwt(modified)).valid, false);
  const unknownHeader = Buffer.from(JSON.stringify({ alg: "EdDSA", kid: "unknown", typ: "JWT+VC" })).toString("base64url");
  assert.equal((await verifyCredentialJwt(`${unknownHeader}.${parts[1]}.${parts[2]}`)).valid, false);
});

test("credentials signed by a rotated key remain verifiable through old public keys", async () => {
  await configureKeys("unit-key-v1");
  const oldPublicKey = process.env.VC_ISSUER_PUBLIC_KEY;
  const oldToken = await signCredentialJwt({ credentialSubject: { id: "old" } });
  await configureKeys("unit-key-v2");
  process.env.VC_ISSUER_PUBLIC_KEYS = JSON.stringify({ "unit-key-v1": oldPublicKey });
  assert.equal((await verifyCredentialJwt(oldToken)).valid, true);
});