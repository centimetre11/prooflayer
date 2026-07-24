import { prisma } from "@/lib/db";
import { planFor } from "@/lib/plans";
import { hashPassword, validatePassword } from "@/lib/password";

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const passwordError = validatePassword(input.password);
  if (!email || !name) {
    return { ok: false as const, code: "INVALID" as const, message: "Please enter your name and email" };
  }
  if (passwordError) {
    return { ok: false as const, code: "WEAK_PASSWORD" as const, message: passwordError };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return {
      ok: false as const,
      code: "EXISTS" as const,
      message: "This email is already registered. Please sign in instead.",
    };
  }

  const passwordHash = await hashPassword(input.password);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    await prisma.subscription.upsert({
      where: { userId: existing.id },
      update: {},
      create: {
        userId: existing.id,
        tier: "FREE",
        appLimit: planFor("FREE").appLimit,
      },
    });
    await prisma.notificationPreference.upsert({
      where: { userId: existing.id },
      update: {},
      create: { userId: existing.id },
    });
    return { ok: true as const, userId: existing.id };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      status: "ACTIVE",
      role: "USER",
      emailVerified: new Date(),
      subscription: {
        create: { tier: "FREE", appLimit: planFor("FREE").appLimit },
      },
      notificationPreference: { create: {} },
    },
  });

  return { ok: true as const, userId: user.id };
}
