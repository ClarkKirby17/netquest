import type { Role } from "@/db/schema";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      name: string;
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
