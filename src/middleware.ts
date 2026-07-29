import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/* Route protection runs on the edge with the db-free config. */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/student/:path*",
    "/instructor/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
    "/account/:path*",
    "/login",
    "/register",
  ],
};
