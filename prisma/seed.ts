import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Database Seed
// Run with: npm run db:seed
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function main() {
  console.warn("🌱 Seeding TrustDNA database...");

  // Seed logic goes here

  console.warn("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
