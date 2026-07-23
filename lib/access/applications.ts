import { prisma } from "@/lib/db";
import { planFor } from "@/lib/plans";
import { sendEmail } from "@/lib/email/send";
import {
  applicationReceivedAdminEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
} from "@/lib/email/templates";
import { envAdminEmails } from "@/lib/admin/roles";

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function adminRecipients(): Promise<{ email: string; userId?: string }[]> {
  const fromDb = await prisma.user.findMany({
    where: { role: "ADMIN", email: { not: null }, status: "ACTIVE" },
    select: { id: true, email: true },
  });
  const map = new Map<string, { email: string; userId?: string }>();
  for (const u of fromDb) {
    if (u.email) map.set(u.email.toLowerCase(), { email: u.email, userId: u.id });
  }
  for (const email of envAdminEmails()) {
    if (!map.has(email)) map.set(email, { email });
  }
  // Dev fallback so applications don't get lost with no admins configured.
  if (map.size === 0) {
    map.set("admin@insightelk.com", { email: "admin@insightelk.com" });
  }
  return [...map.values()];
}

export async function submitAccessApplication(input: {
  email: string;
  name: string;
  company?: string;
  note?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const company = input.company?.trim() || undefined;
  const note = input.note?.trim() || undefined;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser?.status === "ACTIVE") {
    return { ok: false as const, code: "ALREADY_ACTIVE" as const };
  }
  if (existingUser?.status === "SUSPENDED") {
    return { ok: false as const, code: "SUSPENDED" as const };
  }

  const pending = await prisma.accessApplication.findFirst({
    where: { email, status: "PENDING" },
  });
  if (pending) {
    return { ok: false as const, code: "ALREADY_PENDING" as const, id: pending.id };
  }

  const application = await prisma.accessApplication.create({
    data: { email, name, company, note },
  });

  // Ensure a PENDING user row exists so ops can see them early.
  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      status: existingUser?.status === "REJECTED" ? "PENDING" : existingUser?.status ?? "PENDING",
    },
    create: {
      email,
      name,
      status: "PENDING",
      role: "USER",
      subscription: {
        create: { tier: "FREE", appLimit: planFor("FREE").appLimit },
      },
      notificationPreference: { create: {} },
    },
  });

  const base = appUrl();
  const mail = applicationReceivedAdminEmail({
    name,
    email,
    company,
    note,
    reviewUrl: `${base}/admin/applications`,
  });

  const admins = await adminRecipients();
  await Promise.allSettled(
    admins.map((a) =>
      sendEmail({
        to: a.email,
        userId: a.userId,
        kind: "APPLICATION",
        force: true,
        ...mail,
        meta: { applicationId: application.id },
      })
    )
  );

  // Acknowledgement to the applicant.
  await sendEmail({
    to: email,
    kind: "APPLICATION",
    force: true,
    subject: "[麋鹿洞察] 已收到你的使用申请",
    text: `${name}，你好。我们已收到你的使用申请，审核通过后会再发一封邮件通知你登录控制台。`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0b1210">申请已提交</h2>
        <p style="color:#444">${name}，你好。我们已收到你的使用申请。</p>
        <p style="color:#444">审核通过后会再发一封邮件，届时即可登录控制台。</p>
      </div>`,
    meta: { applicationId: application.id, phase: "ack" },
  });

  return { ok: true as const, id: application.id };
}

export async function approveApplication(applicationId: string, reviewerId: string) {
  const app = await prisma.accessApplication.findUnique({
    where: { id: applicationId },
  });
  if (!app) return { ok: false as const, code: "NOT_FOUND" as const };
  if (app.status !== "PENDING") {
    return { ok: false as const, code: "NOT_PENDING" as const };
  }

  await prisma.accessApplication.update({
    where: { id: applicationId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: app.email },
    update: { name: app.name, status: "ACTIVE" },
    create: {
      email: app.email,
      name: app.name,
      status: "ACTIVE",
      role: "USER",
      subscription: {
        create: { tier: "FREE", appLimit: planFor("FREE").appLimit },
      },
      notificationPreference: { create: {} },
    },
  });

  // If user already existed without subscription, ensure one.
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      tier: "FREE",
      appLimit: planFor("FREE").appLimit,
    },
  });

  const loginUrl = `${appUrl()}/login`;
  const mail = applicationApprovedEmail({ name: app.name, loginUrl });
  await sendEmail({
    to: app.email,
    userId: user.id,
    kind: "APPLICATION",
    force: true,
    ...mail,
    meta: { applicationId, decision: "approved" },
  });

  return { ok: true as const, userId: user.id };
}

export async function rejectApplication(
  applicationId: string,
  reviewerId: string,
  reason?: string
) {
  const app = await prisma.accessApplication.findUnique({
    where: { id: applicationId },
  });
  if (!app) return { ok: false as const, code: "NOT_FOUND" as const };
  if (app.status !== "PENDING") {
    return { ok: false as const, code: "NOT_PENDING" as const };
  }

  await prisma.accessApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
    },
  });

  await prisma.user.updateMany({
    where: { email: app.email },
    data: { status: "REJECTED" },
  });

  const user = await prisma.user.findUnique({ where: { email: app.email } });
  const mail = applicationRejectedEmail({ name: app.name, reason });
  await sendEmail({
    to: app.email,
    userId: user?.id,
    kind: "APPLICATION",
    force: true,
    ...mail,
    meta: { applicationId, decision: "rejected" },
  });

  return { ok: true as const };
}

/** Whether this email may receive a magic-link login. */
export async function canLoginWithEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return {
      ok: false as const,
      code: "NOT_REGISTERED" as const,
      message: "该邮箱尚未开通。请先提交使用申请。",
    };
  }
  if (user.role === "ADMIN" || user.status === "ACTIVE") {
    return { ok: true as const, user };
  }
  if (user.status === "PENDING") {
    return {
      ok: false as const,
      code: "PENDING" as const,
      message: "你的申请正在审核中，通过后会收到邮件通知。",
    };
  }
  if (user.status === "REJECTED") {
    return {
      ok: false as const,
      code: "REJECTED" as const,
      message: "申请未通过。如需重新申请，请前往申请页提交。",
    };
  }
  return {
    ok: false as const,
    code: "SUSPENDED" as const,
    message: "账号已停用，请联系管理员。",
  };
}
