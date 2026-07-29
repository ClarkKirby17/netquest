import type { Role } from "@/db/schema";

/* Where each role lands after signing in. Kept free of icon imports
   so the edge middleware can use it without bundling lucide. */
export const HOME_FOR: Record<Role, string> = {
  student: "/student",
  instructor: "/instructor",
  admin: "/admin",
  superadmin: "/superadmin",
};

export const ROLE_PREFIXES: Array<{ prefix: string; role: Role }> = [
  { prefix: "/student", role: "student" },
  { prefix: "/instructor", role: "instructor" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/superadmin", role: "superadmin" },
];
