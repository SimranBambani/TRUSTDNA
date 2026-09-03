"use client";

import { ShieldCheck, Award, Fingerprint, AlertTriangle, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type ActivityEvent = { id: string; eventType: string; category: string; scoreDelta: number; reason: string; occurredAt: string };

export function ActivityFeed({ events = [] }: { events?: ActivityEvent[] }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white">Trust Event Ledger</h3>
          <p className="text-xs text-slate-400">Append-only audit events affecting trust score calculation</p>
        </div>
        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
          Real-time
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No trust activity yet.</p> : events.map((evt) => {
          const Icon = evt.category === "IDENTITY" ? Fingerprint : evt.category === "CREDENTIAL" ? Award : evt.category === "FRAUD" ? AlertTriangle : ShieldCheck;
          const isPositive = evt.scoreDelta > 0;

          return (
            <div
              key={evt.id}
              className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-950/80"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${evt.category === "FRAUD" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : evt.category === "CREDENTIAL" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{evt.reason}</h4>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-400">{evt.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatRelativeTime(evt.occurredAt)}</span>
                  </div>
                </div>
              </div>

              <div className={`text-sm font-bold tracking-tight rounded-lg px-2.5 py-1 ${isPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                {isPositive ? `+${evt.scoreDelta}` : evt.scoreDelta} pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
