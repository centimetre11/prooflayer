import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { submitAccessApplication } from "@/lib/access/applications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2 } from "lucide-react";

export const runtime = "nodejs";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.status === "ACTIVE" || session?.user?.role === "ADMIN") {
    redirect("/dashboard");
  }

  const { done, error } = await searchParams;

  async function apply(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const name = String(formData.get("name") ?? "");
    const company = String(formData.get("company") ?? "");
    const note = String(formData.get("note") ?? "");

    const result = await submitAccessApplication({
      email,
      name,
      company: company || undefined,
      note: note || undefined,
    });

    if (!result.ok) {
      redirect(`/apply?error=${result.code}`);
    }
    redirect("/apply?done=1");
  }

  const errorMessage: Record<string, string> = {
    ALREADY_ACTIVE: "该邮箱已开通，请直接登录控制台。",
    ALREADY_PENDING: "你已有一份待审核申请，请耐心等待邮件通知。",
    SUSPENDED: "该账号已停用，请联系管理员。",
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-5 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} /> 申请使用控制台
          </CardTitle>
          <CardDescription>
            提交后我们会发邮件确认，管理员审核通过后再发一封开通邮件，即可登录。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={40} className="text-[var(--color-accent)]" />
              <p className="font-medium">申请已提交</p>
              <p className="text-sm text-[var(--color-muted)]">
                请查收确认邮件。审核结果会发送到你填写的邮箱；开发环境邮件内容会打印在服务端控制台。
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-2">
                <Link href="/login">已有账号？去登录</Link>
              </Button>
            </div>
          ) : (
            <form action={apply} className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-[color-mix(in_srgb,var(--color-critical)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-critical)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-critical)]">
                  {errorMessage[error] ?? "提交失败，请稍后重试。"}
                  {error === "ALREADY_ACTIVE" ? (
                    <>
                      {" "}
                      <Link href="/login" className="underline">
                        去登录
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-muted)]">姓名</label>
                <input
                  name="name"
                  required
                  placeholder="张三"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-muted)]">工作邮箱</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-muted)]">公司 / 团队（可选）</label>
                <input
                  name="company"
                  placeholder="某某科技"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-muted)]">使用说明（可选）</label>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="打算监测哪些应用、大概什么场景…"
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <Button type="submit" className="w-full">
                提交申请
              </Button>
              <p className="text-center text-xs text-[var(--color-muted)]">
                已开通？{" "}
                <Link href="/login" className="text-[var(--color-primary)] hover:underline">
                  去登录进入控制台
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
