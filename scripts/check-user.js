const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.findFirst({ orderBy: { createdAt: "desc" }, include: { trustScore: true } }).then(u => {
  console.log("User:", u.email);
  console.log("Status:", u.status);
  console.log("MFA Enabled:", u.mfaEnabled);
  console.log("Trust Score:", u.trustScore?.score);
  console.log("Trust Tier:", u.trustScore?.tier);
  console.log("Identity Score:", u.trustScore?.identityScore);
  console.log("Behavior Score:", u.trustScore?.behaviorScore);
  p.$disconnect();
});
