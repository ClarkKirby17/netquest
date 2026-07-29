import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/auth.config";

/* The action layer (login) does the friendly pre-checks — verified?
   approved? throttled? — so by the time authorize() runs, the only
   question left is whether the password matches. */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user || user.status !== "active" || !user.emailVerifiedAt) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: String(user.id),
          name: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
