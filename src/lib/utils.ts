import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─────────────────────────────────────────────────────────────────────────────
// cn — merge Tailwind class names safely
// ─────────────────────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────────────────────
// formatDate — consistent date formatting across the app
// ─────────────────────────────────────────────────────────────────────────────
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now   = Date.now();
  const then  = new Date(date).getTime();
  const delta = now - then;
  const rtf   = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(delta) < 60_000)        return rtf.format(-Math.round(delta / 1_000),        "second");
  if (Math.abs(delta) < 3_600_000)     return rtf.format(-Math.round(delta / 60_000),        "minute");
  if (Math.abs(delta) < 86_400_000)    return rtf.format(-Math.round(delta / 3_600_000),     "hour");
  if (Math.abs(delta) < 2_592_000_000) return rtf.format(-Math.round(delta / 86_400_000),    "day");
  return rtf.format(-Math.round(delta / 2_592_000_000), "month");
}

// ─────────────────────────────────────────────────────────────────────────────
// truncate — shorten long strings with ellipsis
// ─────────────────────────────────────────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

// ─────────────────────────────────────────────────────────────────────────────
// sleep — promise-based delay
// ─────────────────────────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// formatScore — format trust score with tier label
// ─────────────────────────────────────────────────────────────────────────────
export function formatTrustScore(score: number): string {
  return score.toLocaleString("en-US");
}

export function getTrustTierColor(tier: string): string {
  const colors: Record<string, string> = {
    BRONZE:   "text-amber-600",
    SILVER:   "text-slate-400",
    GOLD:     "text-yellow-400",
    PLATINUM: "text-cyan-300",
  };
  return colors[tier] ?? "text-slate-500";
}

// ─────────────────────────────────────────────────────────────────────────────
// generateRequestId — unique ID for request tracing
// ─────────────────────────────────────────────────────────────────────────────
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
