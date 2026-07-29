import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    role: z.enum(["student", "instructor"]),
    fullName: z.string().trim().min(2, "Enter your full name.").max(150),
    email: z.string().trim().toLowerCase().email("Enter a valid email.").max(190),
    password: z.string().min(8, "Use at least 8 characters.").max(100),
    courseId: z.coerce.number().int().positive("Choose your course."),
    sectionId: z.coerce.number().int().positive("Choose your section."),
    instructorId: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.role !== "student" || d.instructorId !== undefined, {
    message: "Choose your instructor.",
    path: ["instructorId"],
  });

export const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "The code is 6 digits."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
