import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/db";
import { sendEmail, magicLinkEmail } from "@/lib/email";
import { isAdminRole, syncEnvAdminRole } from "@/lib/admin/roles";
import { canLoginWithEmail } from "@/lib/access/applications";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Running behind Nginx reverse proxy in production.
  trustHost: true,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=1",
    error: "/login",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY || "dev-fallback",
      from: process.env.EMAIL_FROM || "麋鹿洞察 <onboarding@resend.dev>",
      async sendVerificationRequest({ identifier, url }) {
        const gate = await canLoginWithEmail(identifier);
        if (!gate.ok) {
          console.warn(`[auth] blocked magic link for ${identifier}: ${gate.code}`);
          return;
        }
        const { subject, html, text } = magicLinkEmail(url);
        await sendEmail({
          to: identifier,
          subject,
          html,
          text,
          kind: "MAGIC_LINK",
          userId: gate.user.id,
        });
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const gate = await canLoginWithEmail(user.email);
      return gate.ok;
    },
    async session({ session, user }) {
      if (session.user) {
        await syncEnvAdminRole(user.id, user.email);
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, status: true },
        });
        session.user.id = user.id;
        session.user.role = isAdminRole(dbUser?.role, user.email)
          ? "ADMIN"
          : (dbUser?.role ?? "USER");
        session.user.status = dbUser?.status ?? "PENDING";
      }
      return session;
    },
  },
});
