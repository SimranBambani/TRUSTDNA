"use client";

import { ShieldAlert } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type FraudAlert = { id: string; action: string; timestamp: string; metadata: unknown };

export function FraudAlertsPanel({ alerts = [] }: { alerts?: FraudAlert[] }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Fraud & Anomaly Signals</h3>
            <p className="text-xs text-slate-400">Active automated security flags requiring review</p>
          </div>
        </div>

        <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300">
          {alerts.length} Active
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No fraud alerts for this account.</p> : alerts.map((sig) => (
          <div
            key={sig.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-950/10 p-4 transition-all hover:bg-rose-950/20"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                  <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold text-rose-300 uppercase tracking-wider">
                  SECURITY ALERT
                </span>
                <span className="text-xs font-bold text-white">{sig.action}</span>
              </div>
              <p className="text-xs text-slate-300">Fraud activity was recorded for this account.</p>
              <p className="text-[10px] text-slate-500">{formatRelativeTime(sig.timestamp)}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-all">
                Dismiss
              </button>
              <button className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition-all shadow-sm">
                Sanction Account
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
