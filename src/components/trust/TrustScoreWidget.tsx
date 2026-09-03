"use client";

import { ShieldCheck, Award, Fingerprint, AlertTriangle, TrendingUp } from "lucide-react";
import { getTrustTierColor } from "@/lib/utils";

interface TrustScoreWidgetProps {
  score: number;
  tier: string;
  identityScore: number;
  behaviorScore: number;
  credentialScore: number;
  fraudPenalty: number;
}

export function TrustScoreWidget({
  score,
  tier,
  identityScore,
  behaviorScore,
  credentialScore,
  fraudPenalty,
}: TrustScoreWidgetProps) {
  const percentage = Math.min(100, Math.max(0, (score / 1000) * 100));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-brand-950/40 p-6 backdrop-blur-xl shadow-2xl">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-600/20 blur-3xl" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-brand-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * percentage) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black tracking-tight text-white">{score}</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">/ 1000</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold tracking-wider uppercase ${getTrustTierColor(tier)}`}>
                {tier} Tier
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" /> +15 this month
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">Digital Trust Score</h2>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Your identity trust rating is calculated in real-time from verified credentials and behavioral vectors.
            </p>
          </div>
        </div>

        <div className="w-full md:w-72 space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score Breakdown</div>
          
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5 text-indigo-400" /> Identity</span>
                <span>{identityScore} / 350</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(identityScore / 350) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-400" /> Credentials</span>
                <span>{credentialScore} / 350</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${(credentialScore / 350) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Behavior</span>
                <span>{behaviorScore} / 300</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(behaviorScore / 300) * 100}%` }} />
              </div>
            </div>

            {fraudPenalty > 0 && (
              <div>
                <div className="flex justify-between text-xs font-medium text-rose-400">
                  <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Risk Penalty</span>
                  <span>-{fraudPenalty} pts</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
