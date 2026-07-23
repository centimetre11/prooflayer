import { Resend } from "resend";

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
}

/**
 * Send an email via Resend. If no API key is configured (dev), log to console
 * instead so flows (magic-link login, alerts) remain fully testable offline.
 */
export async function sendEmail({ to, subject, html, text }: EmailInput) {
  const from = process.env.EMAIL_FROM ?? "Prooflayer <onboarding@resend.dev>";
  const resend = getResend();
  if (!resend) {
    console.log(
      `\n[email:dev-fallback] to=${to}\nsubject=${subject}\n${text ?? html}\n`
    );
    return { id: "dev-fallback" };
  }
  const res = await resend.emails.send({ from, to, subject, html, text });
  return { id: res.data?.id ?? "sent" };
}

export function magicLinkEmail(url: string): { subject: string; html: string; text: string } {
  return {
    subject: "登录 Prooflayer",
    text: `点击链接登录 Prooflayer：${url}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0b1020">登录 Prooflayer</h2>
        <p style="color:#444">点击下面的按钮完成登录，链接短时间内有效。</p>
        <p><a href="${url}" style="display:inline-block;background:#5b8cff;color:#08122b;
          padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">登录</a></p>
        <p style="color:#888;font-size:12px">如果不是你本人操作，忽略此邮件即可。</p>
      </div>`,
  };
}

export function alertEmail(appName: string, items: { title: string; severity: string }[]) {
  const rows = items
    .map(
      (i) =>
        `<li style="margin:6px 0"><b style="color:#ff5470">[${i.severity}]</b> ${i.title}</li>`
    )
    .join("");
  return {
    subject: `[Prooflayer] ${appName} 检测到安全回退`,
    text: `${appName} 检测到安全回退：\n${items
      .map((i) => `- [${i.severity}] ${i.title}`)
      .join("\n")}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0b1020">${appName} 检测到安全回退</h2>
        <p style="color:#444">监测发现你的应用出现新的高优风险（配置回退或密钥泄露）：</p>
        <ul style="color:#222">${rows}</ul>
        <p style="color:#888;font-size:12px">我们只告警不阻断。登录控制台查看详情与修复指引。</p>
      </div>`,
  };
}
