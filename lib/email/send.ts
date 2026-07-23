import { Resend } from "resend";
import type { EmailKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canSendEmailKind } from "@/lib/email/preferences";

let client: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

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
}

/**
 * Send an email via Resend, persist a delivery log, and honor user preferences.
 * Without RESEND_API_KEY (dev), logs to console and still records SENT.
 */
export async function sendEmail(input: EmailInput): Promise<SendEmailResult> {
  const kind: EmailKind = input.kind ?? "SYSTEM";
  const from = process.env.EMAIL_FROM ?? "麋鹿洞察 <onboarding@resend.dev>";

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
    const resend = getResend();
    if (!resend) {
      console.log(
        `\n[email:dev-fallback] to=${input.to}\nsubject=${input.subject}\n${input.text ?? input.html}\n`
      );
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          providerId: "dev-fallback",
          sentAt: new Date(),
        },
      });
      return { id: "dev-fallback", deliveryId: delivery.id, status: "SENT" };
    }

    const res = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (res.error) {
      throw new Error(res.error.message);
    }

    const providerId = res.data?.id ?? "sent";
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        providerId,
        sentAt: new Date(),
      },
    });
    return { id: providerId, deliveryId: delivery.id, status: "SENT" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: message },
    });
    throw err;
  }
}
