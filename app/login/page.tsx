import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, LogIn } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { check } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await signIn("resend", { email, redirectTo: "/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn size={18} /> 登录麋鹿洞察
          </CardTitle>
          <CardDescription>输入邮箱，我们会发送一条登录链接（无需密码）。</CardDescription>
        </CardHeader>
        <CardContent>
          {check ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <MailCheck size={40} className="text-[var(--color-accent)]" />
              <p className="font-medium">登录链接已发送</p>
              <p className="text-sm text-[var(--color-muted)]">
                请查收邮件并点击链接完成登录。开发环境下，链接会打印在服务端控制台。
              </p>
            </div>
          ) : (
            <form action={login} className="space-y-4">
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <Button type="submit" className="w-full">
                发送登录链接
              </Button>
              <p className="text-center text-xs text-[var(--color-muted)]">
                种子数据里已有 demo@insightelk.com（Team 方案）可直接登录体验。
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
