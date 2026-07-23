import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

export type EmailProvider = "smtp" | "resend" | "console";

let smtpTransport: Transporter | null = null;
let resendClient: Resend | null = null;

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export function resolveEmailProvider(): EmailProvider {
  const forced = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (forced === "smtp" || forced === "resend" || forced === "console") {
    if (forced === "smtp" && !smtpConfigured()) return "console";
    if (forced === "resend" && !process.env.RESEND_API_KEY) return "console";
    return forced;
  }
  if (smtpConfigured()) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return "console";
}

function getSmtp(): Transporter {
  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT || 465);
    const secure =
      process.env.SMTP_SECURE != null
        ? process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
        : port === 465;
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        // Client passwords are often shown with spaces; strip them.
        pass: (process.env.SMTP_PASS ?? "").replace(/\s+/g, ""),
      },
    });
  }
  return smtpTransport;
}

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY!);
  }
  return resendClient;
}

export async function deliverEmail(input: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ provider: EmailProvider; id: string }> {
  const provider = resolveEmailProvider();

  if (provider === "console") {
    console.log(
      `\n[email:dev-fallback] to=${input.to}\nsubject=${input.subject}\n${input.text ?? input.html}\n`
    );
    return { provider, id: "dev-fallback" };
  }

  if (provider === "smtp") {
    const info = await getSmtp().sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return {
      provider,
      id: typeof info.messageId === "string" ? info.messageId : "smtp-sent",
    };
  }

  const res = await getResend().emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (res.error) throw new Error(res.error.message);
  return { provider, id: res.data?.id ?? "resend-sent" };
}
