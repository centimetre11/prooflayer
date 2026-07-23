import type { EmailKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canSendEmailKind } from "@/lib/email/preferences";
import { deliverEmail, resolveEmailProvider } from "@/lib/email/transport";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind?: EmailKind;
  userId?: string | null;
  relatedAppId?: string | null;
  meta?: Prisma.InputJsonValue;
  /** Skip preference checks (admin test sends). */
  force?: boolean;
}

export interface SendEmailResult {
  id: string;
  deliveryId: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  provider?: string;
}

/**
 * Send an email (SMTP / Resend / console), persist a delivery log,
 * and honor user preferences.
 */
export async function sendEmail(input: EmailInput): Promise<SendEmailResult> {
  const kind: EmailKind = input.kind ?? "SYSTEM";
  const from =
    process.env.EMAIL_FROM ??
    (process.env.SMTP_USER
      ? `麋鹿洞察 <${process.env.SMTP_USER}>`
      : "麋鹿洞察 <onboarding@resend.dev>");

  const delivery = await prisma.emailDelivery.create({
    data: {
      userId: input.userId ?? undefined,
      to: input.to,
      kind,
      subject: input.subject,
      status: "QUEUED",
      relatedAppId: input.relatedAppId ?? undefined,
      meta: input.meta,
    },
  });

  if (!input.force) {
    const gate = await canSendEmailKind(input.userId, kind);
    if (!gate.ok) {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "SKIPPED", error: gate.reason },
      });
      return { id: "skipped", deliveryId: delivery.id, status: "SKIPPED" };
    }
  }

  try {
    const result = await deliverEmail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        providerId: `${result.provider}:${result.id}`,
        sentAt: new Date(),
      },
    });
    return {
      id: result.id,
      deliveryId: delivery.id,
      status: "SENT",
      provider: result.provider,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        error: `[${resolveEmailProvider()}] ${message}`,
      },
    });
    throw err;
  }
}
