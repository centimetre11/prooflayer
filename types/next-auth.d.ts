import type { DefaultSession } from "next-auth";
import type { AccountStatus, UserRole } from "@prisma/client";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: AccountStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    status?: AccountStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: UserRole;
    status?: AccountStatus;
  }
}
