"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export function PublicVerifyPortal() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsVerifying(true);
    fetch(`/api/credentials/verify?token=${encodeURIComponent(token.trim())}`)
      .then(async (response) => setResult(await response.json()))
      .catch(() => setResult({ valid: false, reason: "Verification request failed." }))
      .finally(() => setIsVerifying(false));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">TrustDNA Public Verification Portal</h2>
            <p className="text-xs text-slate-400">Cryptographically verify W3C Verifiable Credentials using public key signatures</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Paste Credential JWT Token
            </label>
            <textarea
              rows={3}
              placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs font-mono text-brand-300 placeholder-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || !token.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-glow-sm hover:from-brand-500 hover:to-indigo-500 transition-all disabled:opacity-50"
          >
            {isVerifying ? (
              <span>Verifying Cryptographic Signature...</span>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>Verify Credential Authenticity</span>
              </>
            )}
          </button>
        </form>
      </div>

      {result && (
        <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 backdrop-blur-xl shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  CRYPTOGRAPHICALLY VALID
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{String(result.credentialType)}</h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Revocation Status</span>
              <span className="text-xs font-bold text-emerald-400">{String(result.revocationStatus)}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
              <div className="text-slate-400 font-semibold">Issuer Identity</div>
              <div className="font-bold text-white text-sm">{String(result.issuer)}</div>
              <div className="text-slate-500">Algorithm: {String(result.signatureAlgorithm)}</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
              <div className="text-slate-400 font-semibold">Credential Subject</div>
              <div className="font-bold text-white text-sm">{String(result.subject)}</div>
              <div className="text-slate-500">Issued: {new Date(String(result.issuedAt)).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-400">Verified Claims Payload</div>
            <div className="space-y-1">
              {Object.entries((result.claims as Record<string, unknown>) ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-800/40 last:border-0">
                  <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}:</span>
                  <span className="font-bold text-slate-200">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
