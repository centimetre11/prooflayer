import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/db";
import { sendEmail, magicLinkEmail } from "@/lib/email";
import { isAdminRole, syncEnvAdminRole } from "@/lib/admin/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Running behind Nginx reverse proxy in production.
  trustHost: true,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=1",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY || "dev-fallback",
      from: process.env.EMAIL_FROM || "麋鹿洞察 <onboarding@resend.dev>",
      // Handle sending ourselves so dev works without a Resend key.
      async sendVerificationRequest({ identifier, url }) {
        const user = await prisma.user.findUnique({
          where: { email: identifier },
          select: { id: true },
        });
        const { subject, html, text } = magicLinkEmail(url);
        await sendEmail({
          to: identifier,
          subject,
          html,
          text,
          kind: "MAGIC_LINK",
          userId: user?.id,
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        await syncEnvAdminRole(user.id, user.email);
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.id = user.id;
        session.user.role = isAdminRole(dbUser?.role, user.email)
          ? "ADMIN"
          : (dbUser?.role ?? "USER");
      }
      return session;
    },
  },
});
