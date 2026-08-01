"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
import { ArrowRight, GraduationCap, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerAction, type ActionState } from "../actions";

type Course = { id: number; name: string };
type Section = { id: number; name: string; courseId: number };
type Instructor = { id: number; name: string; sectionId: number };

const initial: ActionState = {};

export default function RegisterForm({
  courses,
  sections,
  instructors,
}: {
  courses: Course[];
  sections: Section[];
  instructors: Instructor[];
}) {
  const [state, action, pending] = useActionState(registerAction, initial);
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [courseId, setCourseId] = useState<number | "">("");
  const [sectionId, setSectionId] = useState<number | "">("");

  /* The cascade: sections filter by course, instructors by section.
     The server re-validates the same rule on submit. */
  const sectionOptions = useMemo(
    () => (courseId === "" ? [] : sections.filter((s) => s.courseId === courseId)),
    [courseId, sections]
  );
  const instructorOptions = useMemo(
    () => (sectionId === "" ? [] : instructors.filter((i) => i.sectionId === sectionId)),
    [sectionId, instructors]
  );

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <>
      <h1 className="font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Your {role === "student" ? "instructor" : "admin"} approves the request
        before you can sign in.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        {(
          [
            ["student", "Student", GraduationCap],
            ["instructor", "Instructor", Presentation],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-[10px] border px-4 py-4 transition-all duration-150",
              role === value
                ? "border-[var(--color-signal)] bg-[var(--color-signal-soft)] text-[var(--color-signal)]"
                : "border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-muted)]"
            )}
          >
            <Icon size={20} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="role" value={role} />

        <Field label="Full name" name="fullName" type="text" placeholder="Juan Dela Cruz" error={err("fullName")} />
        <Field label="Email" name="email" type="email" placeholder="you@school.edu" error={err("email")} />
        <Field label="Password" name="password" type="password" placeholder="At least 8 characters" error={err("password")} />

        <Select
          label="Course"
          name="courseId"
          value={courseId}
          onChange={(v) => { setCourseId(v); setSectionId(""); }}
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Choose your course"
          error={err("courseId")}
        />

        <Select
          label="Section"
          name="sectionId"
          value={sectionId}
          onChange={setSectionId}
          options={sectionOptions.map((s) => ({ value: s.id, label: s.name }))}
          placeholder={courseId === "" ? "Pick a course first" : "Choose your section"}
          disabled={courseId === ""}
          error={err("sectionId")}
        />

        {role === "student" && (
          <Select
            label="Instructor"
            name="instructorId"
            value=""
            onChange={() => {}}
            uncontrolled
            options={instructorOptions.map((i) => ({ value: i.id, label: i.name }))}
            placeholder={
              sectionId === ""
                ? "Pick a section first"
                : instructorOptions.length === 0
                  ? "No instructor for this section yet"
                  : "Choose your instructor"
            }
            disabled={sectionId === "" || instructorOptions.length === 0}
            error={err("instructorId")}
          />
        )}

        {state.error && (
          <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary mt-2 w-full disabled:opacity-60">
          {pending ? "Creating…" : "Create account"} <ArrowRight size={16} />
        </button>

        <p className="text-center text-xs leading-relaxed text-[var(--color-muted)]">
          We&apos;ll email you a 6-digit code to confirm your address.
        </p>
      </form>

      <p className="mt-7 border-t border-[var(--color-line)] pt-6 text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--color-signal)] hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- */

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)] disabled:opacity-45";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

function ErrorLine({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-[var(--color-alert)]">{msg}</p>;
}

function Field({
  label, name, type, placeholder, error }: {
  label: string; name: string; type: string; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelCx}>{label}</label>
      <input id={name} name={name} type={type} placeholder={placeholder} required className={inputCx} />
      <ErrorLine msg={error} />
    </div>
  );
}

function Select({
  label, name, value, onChange, options, placeholder, disabled, error, uncontrolled }: {
  label: string;
  name: string;
  value: number | "";
  onChange: (v: number | "") => void;
  options: { value: number; label: string }[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  uncontrolled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelCx}>{label}</label>
      <select
        id={name}
        name={name}
        {...(uncontrolled ? {} : { value })}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={cn(inputCx, "cursor-pointer")}
        required
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ErrorLine msg={error} />
    </div>
  );
}
