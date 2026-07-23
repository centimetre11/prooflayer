import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { UserPlus } from "lucide-react";

export const runtime = "nodejs";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.status === "ACTIVE" || session?.user?.role === "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-5 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus size={18} /> 注册控制台账号
          </CardTitle>
          <CardDescription>
            注册后可管理应用、开启监测与接收告警。若只想收产品资讯，请用首页「登记邮箱」。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
