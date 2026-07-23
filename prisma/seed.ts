import { PrismaClient, Prisma, type Severity } from "@prisma/client";
import bcrypt from "bcryptjs";
import { allRuleSets } from "../lib/rules/loader";

const prisma = new PrismaClient();

/** Default password for seeded accounts — change after first login in production. */
const SEED_PASSWORD = process.env.SEED_PASSWORD || "InsightElk2026!";

async function main() {
  let ruleCount = 0;
  for (const rs of allRuleSets()) {
    for (const r of rs.rules) {
      await prisma.rule.upsert({
        where: { ruleId_version: { ruleId: r.id, version: rs.version } },
        update: {
          category: r.category,
          severity: r.severity as Severity,
          matcherType: r.matcherType,
          title: r.title,
          description: r.description,
          payload: r.payload as unknown as Prisma.InputJsonValue,
          enabled: r.enabled ?? true,
        },
        create: {
          ruleId: r.id,
          version: rs.version,
          category: r.category,
          severity: r.severity as Severity,
          matcherType: r.matcherType,
          title: r.title,
          description: r.description,
          payload: r.payload as unknown as Prisma.InputJsonValue,
          enabled: r.enabled ?? true,
        },
      });
      ruleCount++;
    }
  }
  console.log(`Seeded ${ruleCount} rules.`);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@insightelk.com" },
    update: {
      status: "ACTIVE",
      role: "USER",
      passwordHash,
    },
    create: {
      email: "demo@insightelk.com",
      name: "Demo Founder",
      role: "USER",
      status: "ACTIVE",
      passwordHash,
      subscription: {
        create: { tier: "TEAM", appLimit: 15 },
      },
      notificationPreference: { create: {} },
    },
  });
  console.log(`Demo user: ${demo.email} / ${SEED_PASSWORD}`);

  const admin = await prisma.user.upsert({
    where: { email: "admin@insightelk.com" },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
    },
    create: {
      email: "admin@insightelk.com",
      name: "Ops Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
      subscription: {
        create: { tier: "ENTERPRISE", appLimit: 9999 },
      },
      notificationPreference: { create: {} },
    },
  });
  console.log(`Admin user: ${admin.email} / ${SEED_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
