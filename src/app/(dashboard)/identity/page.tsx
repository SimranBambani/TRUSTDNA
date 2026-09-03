"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Fingerprint } from "lucide-react";

export default function IdentityPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/identity"), fetch("/api/kyc/status")]).then(async ([profileResponse, kycResponse]) => {
      if (!profileResponse.ok || !kycResponse.ok) throw new Error();
      const [profile, kyc] = await Promise.all([profileResponse.json(), kycResponse.json()]);
      setData({ profile: profile.data, kyc: kyc.data });
    }).catch(() => setError(true));
  }, []);

  const request = data?.profile.verificationRequests?.[0];
  const status = data?.kyc?.status || request?.status || "NOT_STARTED";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Identity Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your verified identity, document checks, and KYC status.
          </p>
        </div>

        <Link
          href="/identity/verify"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm hover:from-brand-500 hover:to-indigo-500 transition-all"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Start KYC Verification</span>
        </Link>
      </div>

      {error ? <p className="rounded-xl border border-rose-500/30 p-5 text-sm text-rose-300">Unable to load identity data.</p> : !data ? <p className="py-12 text-center text-sm text-slate-400">Loading identity data...</p> : <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Fingerprint className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">{status.replace(/_/g, " ")}</span>
              <span className="text-xs text-slate-500">{request?.expiresAt ? `Expires: ${new Date(request.expiresAt).toLocaleDateString()}` : "No expiry date"}</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Identity verification profile</h3>
            <p className="text-xs text-slate-400">Your current identity verification status and submitted documents.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-xs font-semibold text-slate-400">Trust Score Weight</span>
            <span className="text-lg font-black text-emerald-400">{status === "VERIFIED" ? "Verified" : "Pending"}</span>
          </div>
        </div>
      </div>}
    </div>
  );
}
