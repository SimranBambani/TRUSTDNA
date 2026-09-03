const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    // 1. Test raw connection
    const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");
    console.log("✅ DATABASE CONNECTION: OK");

    // 2. List all tables
    const tables = await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    console.log("✅ TABLES FOUND:", tables.map((t) => t.tablename).join(", "));

    // 3. Count rows in key tables
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const credCount = await prisma.credential.count();
    const sessionCount = await prisma.session.count();
    const auditCount = await prisma.auditLog.count();
    const trustScoreCount = await prisma.trustScore.count();
    const trustEventCount = await prisma.trustEvent.count();
    const notifCount = await prisma.notification.count();
    const verReqCount = await prisma.verificationRequest.count();

    console.log("\n📊 TABLE ROW COUNTS:");
    console.log("   Users:                ", userCount);
    console.log("   Organizations:        ", orgCount);
    console.log("   Credentials:          ", credCount);
    console.log("   Sessions:             ", sessionCount);
    console.log("   TrustScores:          ", trustScoreCount);
    console.log("   TrustEvents:          ", trustEventCount);
    console.log("   AuditLogs:            ", auditCount);
    console.log("   Notifications:        ", notifCount);
    console.log("   VerificationRequests: ", verReqCount);

    console.log("\n✅ ALL DATABASE CHECKS PASSED");
  } catch (err) {
    console.error("❌ DATABASE ERROR:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
