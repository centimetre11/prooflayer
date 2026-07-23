import { PrismaClient, Prisma, type Severity } from "@prisma/client";
import { allRuleSets } from "../lib/rules/loader";

const prisma = new PrismaClient();

async function main() {
  // 1) Snapshot every ruleset into the Rule catalog so historical reports
  //    remain reproducible even as rules evolve.
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

  // 2) Demo account (magic-link login by this email works in dev).
  const demo = await prisma.user.upsert({
    where: { email: "demo@insightelk.com" },
    update: {},
    create: {
      email: "demo@insightelk.com",
      name: "Demo Founder",
      role: "USER",
      subscription: {
        create: { tier: "TEAM", appLimit: 15 },
      },
      notificationPreference: { create: {} },
    },
  });
  console.log(`Demo user: ${demo.email}`);

  // 3) Admin account for the ops console.
  const admin = await prisma.user.upsert({
    where: { email: "admin@insightelk.com" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@insightelk.com",
      name: "Ops Admin",
      role: "ADMIN",
      subscription: {
        create: { tier: "ENTERPRISE", appLimit: 9999 },
      },
      notificationPreference: { create: {} },
    },
  });
  console.log(`Admin user: ${admin.email} (role=${admin.role})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
