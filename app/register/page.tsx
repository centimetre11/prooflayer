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
            <UserPlus size={18} /> Create a console account
          </CardTitle>
          <CardDescription>
            Once registered, you can manage apps, enable monitoring, and receive alerts. If you only want product updates, use “Subscribe with email” on the home page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
