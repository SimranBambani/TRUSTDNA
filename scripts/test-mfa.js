const assert = require("node:assert/strict");
const OTPAuth = require("otpauth");

const totp = new OTPAuth.TOTP({
  issuer: "TrustDNA",
  label: "mfa-test@example.com",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
  secret: "JBSWY3DPEHPK3PXP",
});

const timestamp = 0;
const validCode = totp.generate({ timestamp });
assert.equal(validCode, "282760");
assert.notEqual(validCode, totp.secret.base32);
assert.equal(totp.validate({ token: "000000", timestamp, window: 0 }), null);
assert.equal(totp.validate({ token: validCode, timestamp: 30000, window: 0 }), null);
assert.notEqual(totp.validate({ token: validCode, timestamp: 30000, window: 1 }), null);

console.log("MFA TOTP checks passed: correct, incorrect, expired, and clock-skew codes");
