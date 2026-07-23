import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { canLoginWithEmail } from "@/lib/access/applications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, LogIn, ClipboardList, ArrowRight } from "lucide-react";

export const runtime = "nodejs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; error?: string; email?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    const ok =
      session.user.role === "ADMIN" || session.user.status === "ACTIVE";
    if (ok) redirect("/dashboard");
  }

  const { check, error, email: prefill } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const gate = await canLoginWithEmail(email);
    if (!gate.ok) {
      redirect(`/login?error=${gate.code}&email=${encodeURIComponent(email)}`);
    }
    await signIn("resend", { email, redirectTo: "/dashboard" });
  }

  const errorMessage: Record<string, string> = {
    NOT_REGISTERED: "该邮箱尚未开通，请先提交使用申请。",
    PENDING: "申请正在审核中，通过后会收到邮件，再来登录。",
    REJECTED: "申请未通过。你可以重新提交申请。",
    SUSPENDED: "账号已停用，请联系管理员。",
    inactive: "账号尚未激活，请等待审核或重新申请。",
    AccessDenied: "登录被拒绝：账号未开通或未通过审核。",
    Configuration: "登录配置异常，请稍后重试。",
    Verification: "登录链接无效或已过期，请重新获取。",
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-4 px-5 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn size={18} /> 登录控制台
          </CardTitle>
          <CardDescription>
            已开通账号：输入邮箱，我们发送登录链接（无需密码）。未开通请先申请。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {check ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <MailCheck size={40} className="text-[var(--color-accent)]" />
              <p className="font-medium">登录链接已发送</p>
              <p className="text-sm text-[var(--color-muted)]">
                请打开邮箱点击链接进入控制台。若几分钟内未收到，请检查垃圾箱。
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-2">
                <Link href="/dashboard">已点击链接？进入控制台</Link>
              </Button>
            </div>
          ) : (
            <form action={login} className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-[color-mix(in_srgb,var(--color-critical)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-critical)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-critical)]">
                  {errorMessage[error] ?? "登录失败，请稍后重试。"}
                  {error === "NOT_REGISTERED" || error === "REJECTED" ? (
                    <>
                      {" "}
                      <Link href="/apply" className="underline">
                        去申请
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              <input
                name="email"
                type="email"
                required
                defaultValue={prefill ?? ""}
                placeholder="已开通的邮箱"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <Button type="submit" className="w-full">
                发送登录链接
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!check ? (
        <Card className="w-full border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-primary)]">
                <ClipboardList size={18} />
              </span>
              <div>
                <p className="font-medium">还没有账号？</p>
                <p className="text-sm text-[var(--color-muted)]">
                  先提交使用申请，管理员审核通过后会发邮件通知你登录。
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link href="/apply">
                申请成为用户 <ArrowRight size={14} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
