"use client";

import Link from "next/link";
import { Search, Bell, ShieldCheck, CheckCircle2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export function TopNav() {
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; role: string; emailVerified: boolean } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    Promise.all([fetch("/api/identity"), fetch("/api/notifications")]).then(async ([profileResponse, notificationsResponse]) => {
      const [profileBody, notificationsBody] = await Promise.all([profileResponse.json(), notificationsResponse.json()]);
      setProfile(profileBody.data?.user ?? null);
      setUnreadCount((notificationsBody.data ?? []).filter((notification: { status: string }) => notification.status !== "READ").length);
    }).catch(() => undefined);
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      document.cookie = "tdna_access=; path=/; max-age=0;";
      document.cookie = "tdna_refresh=; path=/; max-age=0;";
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 w-72">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search credentials, users, logs..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/verify"
          target="_blank"
          className="hidden md:flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300 hover:bg-brand-500/20 transition-all"
        >
          <ShieldCheck className="h-4 w-4 text-brand-400" />
          <span>Verify Portal</span>
        </Link>

        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white transition-all"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white shadow-sm">
            {unreadCount}
          </span>
        </Link>

        <div className="h-6 w-[1px] bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-sm font-semibold text-white shadow-sm">
            {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : "?"}
            <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-slate-950 p-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 fill-emerald-400/20" />
            </div>
          </div>

          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-white">{profile ? `${profile.firstName} ${profile.lastName}` : "Loading profile..."}</span>
            <span className="block text-[10px] text-slate-400">{profile ? `${profile.role.replace(/_/g, " ")} · ${profile.emailVerified ? "Verified" : "Unverified"}` : ""}</span>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
