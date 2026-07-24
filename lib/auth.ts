import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isAdminRole, syncEnvAdminRole } from "@/lib/admin/roles";
import type { AccountStatus, UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Credentials + JWT (database sessions are not supported with credentials).
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        if (user.role !== "ADMIN" && user.status !== "ACTIVE") return null;

        await syncEnvAdminRole(user.id, user.email);
        const role: UserRole = isAdminRole(user.role, user.email)
          ? "ADMIN"
          : user.role;
        const status: AccountStatus =
          role === "ADMIN" ? "ACTIVE" : user.status;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: UserRole }).role ?? "USER";
        token.status = (user as { status?: AccountStatus }).status ?? "PENDING";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as UserRole) ?? "USER";
        session.user.status = (token.status as AccountStatus) ?? "PENDING";
      }
      return session;
    },
  },
});
