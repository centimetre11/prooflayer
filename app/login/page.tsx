import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { LogIn } from "lucide-react";

export const runtime = "nodejs";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    const ok =
      session.user.role === "ADMIN" || session.user.status === "ACTIVE";
    if (ok) redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn size={18} /> Sign in to console
          </CardTitle>
          <CardDescription>Sign in with your email and password. You can still scan apps without signing in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
