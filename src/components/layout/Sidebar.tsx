"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Fingerprint,
  Award,
  Building2,
  Bell,
  Settings,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/config/constants";

const ICON_MAP = {
  LayoutDashboard,
  ShieldCheck,
  Fingerprint,
  Award,
  Building2,
  Bell,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col justify-between border-r border-slate-800 bg-slate-950/80 px-4 py-6 backdrop-blur-xl">
      <div className="space-y-6">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 shadow-glow-sm">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">Trust<span className="text-brand-400">DNA</span></span>
            <span className="block text-[10px] font-medium tracking-wider text-slate-400 uppercase">Identity & Trust</span>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Main Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ShieldCheck;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-600/15 text-brand-400 border border-brand-500/20 shadow-sm"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5 transition-transform duration-200 group-hover:scale-110", isActive ? "text-brand-400" : "text-slate-400")} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-brand-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Admin Navigation link */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Administration
          </div>
          <Link
            href="/admin"
            className={cn(
              "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              pathname?.startsWith("/admin")
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-sm"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <span>Admin Console</span>
            </div>
            <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              Admin
            </span>
          </Link>
        </div>
      </div>

      {/* Trust Status Badge Card */}
      <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-b from-brand-950/40 to-slate-900/60 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-400">
          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
          <span>Trust status</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
          Organization trust data will appear when available.
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/3 bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}
