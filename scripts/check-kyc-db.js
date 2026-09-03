const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const kyc = await prisma.kYCVerification.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      personalIdentity: true,
      documents: true,
      livenessSessions: true,
      riskEngine: true,
      auditLogs: true,
    },
  });

  console.log("=========================================");
  console.log("POSTGRESQL DB RECORD VERIFICATION:");
  console.log("=========================================");
  console.log("KYC ID:", kyc.id);
  console.log("User ID:", kyc.userId);
  console.log("Status:", kyc.status);
  console.log("Decision:", kyc.decision);
  console.log("Risk Score:", kyc.riskScore);
  console.log("Risk Level:", kyc.riskLevel);
  console.log("Personal Identity:", kyc.personalIdentity.firstName, kyc.personalIdentity.lastName, kyc.personalIdentity.nationality);
  console.log("Document Count:", kyc.documents.length, "Magic Bytes Verified:", kyc.documents[0].magicBytesVerified);
  console.log("Liveness Session Count:", kyc.livenessSessions.length, "Liveness Passed:", kyc.livenessSessions[0].livenessPassed);
  console.log("Audit Logs Count:", kyc.auditLogs.length);
  console.log("=========================================");
}

main().finally(() => prisma.$disconnect());
