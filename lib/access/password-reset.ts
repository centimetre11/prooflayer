import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { hashPassword, validatePassword } from "@/lib/password";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const IDENTIFIER_PREFIX = "password-reset:";

function appBaseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function resetIdentifier(email: string) {
  return `${IDENTIFIER_PREFIX}${email}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Request a password-reset email. Always returns ok to avoid account enumeration.
 */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email) {
    return { ok: true as const };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Only credential accounts can reset; missing/inactive users get the same response.
  if (!user?.passwordHash || !user.email) {
    return { ok: true as const };
  }
  if (user.status === "REJECTED" || user.status === "SUSPENDED") {
    return { ok: true as const };
  }

  const identifier = resetIdentifier(email);
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  // Invalidate prior unused reset tokens for this email.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: tokenHash, expires },
  });

  const url = `${appBaseUrl()}/reset-password?token=${rawToken}`;
  const tpl = passwordResetEmail(url);

  await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    kind: "SYSTEM",
    userId: user.id,
    force: true,
    meta: { purpose: "password-reset" },
  });

  return { ok: true as const };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}) {
  const token = input.token.trim();
  if (!token) {
    return { ok: false as const, message: "Invalid or expired reset link" };
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    return { ok: false as const, message: passwordError };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.verificationToken.findFirst({
    where: {
      token: tokenHash,
      expires: { gt: new Date() },
      identifier: { startsWith: IDENTIFIER_PREFIX },
    },
  });

  if (!record) {
    return { ok: false as const, message: "Invalid or expired reset link" };
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    });
    return { ok: false as const, message: "Invalid or expired reset link" };
  }
  if (user.status === "REJECTED" || user.status === "SUSPENDED") {
    return { ok: false as const, message: "This account cannot reset its password" };
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);

  return { ok: true as const };
}
