import {
  Award,
  BarChart3,
  BookOpen,
  Database,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ScrollText,
  Terminal,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/db/schema";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/* One login, four destinations — HOME_FOR lives in lib/roles.ts so
   the edge middleware can import it without pulling in the icons. */
export { HOME_FOR } from "@/lib/roles";

export const NAV: Record<Role, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Modules", href: "/student/modules", icon: BookOpen },
    { label: "Quizzes", href: "/student/quizzes", icon: GraduationCap },
    { label: "Arcade", href: "/student/arcade", icon: Gamepad2 },
    { label: "Leaderboard", href: "/student/leaderboard", icon: Trophy },
    { label: "Achievements", href: "/student/achievements", icon: Award },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  instructor: [
    { label: "Dashboard", href: "/instructor", icon: LayoutDashboard },
    { label: "Approvals", href: "/instructor/approvals", icon: UserCheck },
    { label: "My quizzes", href: "/instructor/quizzes", icon: GraduationCap },
    { label: "Game questions", href: "/instructor/questions", icon: Gamepad2 },
    { label: "CLI missions", href: "/instructor/missions", icon: Terminal },
    { label: "Students", href: "/instructor/students", icon: Users },
    { label: "Analytics", href: "/instructor/analytics", icon: BarChart3 },
    { label: "Reports", href: "/instructor/reports", icon: FileText },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Approvals", href: "/admin/approvals", icon: UserCheck },
    { label: "Curriculum", href: "/admin/modules", icon: BookOpen },
    { label: "Default quizzes", href: "/admin/quizzes", icon: GraduationCap },
    { label: "Question pool", href: "/admin/questions", icon: Gamepad2 },
    { label: "CLI missions", href: "/admin/missions", icon: Terminal },
    { label: "Courses", href: "/admin/courses", icon: Layers },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Reports", href: "/admin/reports", icon: FileText },
  ],
  superadmin: [
    { label: "Dashboard", href: "/superadmin", icon: LayoutDashboard },
    { label: "Admins", href: "/superadmin/admins", icon: ShieldCheck },
    { label: "Audit log", href: "/superadmin/audit", icon: ScrollText },
    { label: "Settings", href: "/superadmin/settings", icon: SlidersHorizontal },
    { label: "Maintenance", href: "/superadmin/maintenance", icon: Database },
    { label: "Analytics", href: "/superadmin/analytics", icon: BarChart3 },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  instructor: "Instructor",
  admin: "Admin",
  superadmin: "Super Admin",
};
