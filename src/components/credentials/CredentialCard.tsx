"use client";

import { useState } from "react";
import { Award, CheckCircle2, Copy, Check, ExternalLink, Calendar, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CredentialCardProps {
  credential: {
    id: string;
    type: string;
    issuer: string;
    subject: string;
    issuedAt: string;
    expiresAt?: string | null;
    status: string;
    claims: Record<string, unknown>;
    jwt: string;
  };
}

export function CredentialCard({ credential }: CredentialCardProps) {
  const [copied, setCopied] = useState(false);

  const copyJwt = () => {
    navigator.clipboard.writeText(credential.jwt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-brand-950/30 p-6 backdrop-blur-xl transition-all duration-300 hover:border-brand-500/40 hover:shadow-glow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Verifiable Credential</span>
            <h4 className="text-base font-bold text-white">{credential.type}</h4>
          </div>
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" /> Active
        </span>
      </div>

      <div className="mt-5 space-y-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
        {Object.entries(credential.claims).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-400 capitalize">{key.replace(/_/g, " ")}:</span>
            <span className="font-bold text-slate-200">{String(val)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-4">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-500" />
          <span>Issuer: <strong className="text-slate-300">{credential.issuer}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span>Issued: <strong className="text-slate-300">{formatDate(credential.issuedAt)}</strong></span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={copyJwt}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 py-2 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
          <span>{copied ? "JWT Copied" : "Copy VC JWT"}</span>
        </button>

        <a
          href={`/verify?token=${encodeURIComponent(credential.jwt)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-all shadow-sm"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
