"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; createdAt: string; status: string }>>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/notifications").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load notifications");
      setNotifications(body.data);
      setState("ready");
    }).catch(() => setState("error"));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Notifications & Alerts</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time security notifications, credential issuances, and trust events.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        {state === "loading" ? <p className="py-8 text-center text-sm text-slate-400">Loading notifications...</p> : state === "error" ? <p className="py-8 text-center text-sm text-rose-300">Unable to load notifications.</p> : notifications.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No notifications yet.</p> : notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-all ${
              n.status !== "READ" ? "border-brand-500/40 bg-brand-950/20" : "border-slate-800/80 bg-slate-950/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 mt-0.5">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{n.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5">{n.body}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">{formatRelativeTime(n.createdAt)}</span>
              </div>
            </div>

            {n.status !== "READ" && (
              <span className="flex h-2 w-2 rounded-full bg-brand-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
