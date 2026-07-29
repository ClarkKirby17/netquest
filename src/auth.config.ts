import type { NextAuthConfig } from "next-auth";
import { HOME_FOR, ROLE_PREFIXES } from "@/lib/roles";
import type { Role } from "@/db/schema";

/* Everything the edge middleware needs, with zero database imports.
   The credentials provider (which does hit the db) lives in auth.ts. */
export const authConfig = {
  /* `next start` and Vercel both run in production mode, where Auth.js
     refuses an untrusted Host header unless told otherwise. Vercel and
     most managed hosts set that header themselves, so trusting it is
     safe here; behind a proxy you control, sanitise it upstream. */
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [], // filled in auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role as Role | undefined;

      // Signed-in users don't need the auth pages.
      if (role && (pathname === "/login" || pathname === "/register")) {
        return Response.redirect(new URL(HOME_FOR[role], request.nextUrl));
      }

      // Account settings: any signed-in role, but a session is required.
      if (pathname === "/account" || pathname.startsWith("/account/")) {
        return Boolean(role);
      }

      // Role-gated portals.
      for (const { prefix, role: required } of ROLE_PREFIXES) {
        if (pathname === prefix || pathname.startsWith(prefix + "/")) {
          if (!role) return false; // → /login
          if (role !== required) {
            return Response.redirect(new URL(HOME_FOR[role], request.nextUrl));
          }
        }
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
