import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/db";
import { sendEmail, magicLinkEmail } from "@/lib/email";

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
      from: process.env.EMAIL_FROM || "Prooflayer <onboarding@resend.dev>",
      // Handle sending ourselves so dev works without a Resend key.
      async sendVerificationRequest({ identifier, url }) {
        const { subject, html, text } = magicLinkEmail(url);
        await sendEmail({ to: identifier, subject, html, text });
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
