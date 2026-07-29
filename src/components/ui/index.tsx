import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   UI PRIMITIVES
   Every screen is built from these, so the design stays
   consistent as the app grows. Change it here, it changes
   everywhere.
   ══════════════════════════════════════════════════════════════ */

/* ---------------------------------------------------------- LED
   Switch-port activity light. Carries real state, not decoration. */
export function Led({
  state = "off",
  className,
}: {
  state?: "off" | "live" | "done" | "wire";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "led",
        state === "live" && "led-live",
        state === "done" && "led-done",
        state === "wire" && "led-wire",
        className
      )}
    />
  );
}

/* --------------------------------------------------------- Card */
export function Card({
  className,
  hover = false,
  children,
}: {
  className?: string;
  hover?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("nq-card", hover && "nq-card-hover", className)}>
      {children}
    </div>
  );
}

export function CardHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4">
      <div>
        <h2 className="text-[.95rem] font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-[var(--color-muted)]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------- Eyebrow */
export function Eyebrow({
  children,
  led = "live",
}: {
  children: React.ReactNode;
  led?: "live" | "wire" | "done";
}) {
  return (
    <span className="nq-eyebrow">
      <Led state={led} />
      {children}
    </span>
  );
}

/* ---------------------------------------------------- Page header */
export function PageHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {sub && <p className="mt-1.5 text-[var(--color-muted)]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------- Stat tile */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "signal",
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "signal" | "wire" | "warn" | "plain";
}) {
  const toneMap = {
    signal: "text-[var(--color-signal)] bg-[var(--color-signal-soft)]",
    wire: "text-[var(--color-wire)] bg-[var(--color-wire-soft)]",
    warn: "text-[var(--color-warn)] bg-[rgba(255,184,77,.1)]",
    plain: "text-[var(--color-muted)] bg-[rgba(255,255,255,.04)]",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
              toneMap[tone]
            )}
          >
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-display-src)] text-2xl font-bold leading-none">
            {value}
          </div>
          <div className="mt-1.5 font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
            {label}
          </div>
          {hint && <div className="mt-1 text-xs text-[var(--color-muted)]">{hint}</div>}
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------- Button */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "danger" &&
          "border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.1)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.18)]",
        size === "sm" && "px-3 py-1.5 text-[.82rem]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------- Pill */
export function Pill({
  tone = "muted",
  children,
}: {
  tone?: "signal" | "wire" | "warn" | "alert" | "muted";
  children: React.ReactNode;
}) {
  const map = {
    signal: "border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] text-[var(--color-signal)]",
    wire: "border-[rgba(0,201,255,.3)] bg-[var(--color-wire-soft)] text-[var(--color-wire)]",
    warn: "border-[rgba(255,184,77,.3)] bg-[rgba(255,184,77,.1)] text-[var(--color-warn)]",
    alert: "border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.1)] text-[var(--color-alert)]",
    muted: "border-[var(--color-line)] text-[var(--color-muted)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-wider",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------- Progress */
export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between font-[family-name:var(--font-mono-src)] text-[.7rem] text-[var(--color-muted)]">
          <span>{label}</span>
          <span className="text-[var(--color-signal)]">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,.07)]">
        <div
          className="h-full rounded-full bg-[var(--color-signal)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, boxShadow: "0 0 10px rgba(0,245,160,.5)" }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------- Empty state
   An empty screen is an invitation to act, never just "no data". */
export function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-line)] text-[var(--color-muted)]">
          <Icon size={20} />
        </span>
      )}
      <h3 className="font-semibold">{title}</h3>
      {body && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------- Table */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[var(--color-line)] px-5 py-3 text-left font-[family-name:var(--font-mono-src)] text-[.68rem] font-medium uppercase tracking-[.14em] text-[var(--color-muted)]",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-[var(--color-line)] px-5 py-3.5", className)}>
      {children}
    </td>
  );
}

/* ------------------------------------------------------- Skeleton */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[rgba(255,255,255,.05)]",
        className
      )}
    />
  );
}
