"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight, ArrowLeft } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"IDLE" | "VERIFYING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"IDLE" | "LOADING" | "SENT" | "ERROR">("IDLE");
  const [resendMsg, setResendMsg] = useState("");
  const [resendToken, setResendToken] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (verifyToken: string) => {
    setStatus("VERIFYING");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus("ERROR");
        setErrorMessage(json.error || "Email verification failed.");
        return;
      }

      setStatus("SUCCESS");
    } catch {
      setStatus("ERROR");
      setErrorMessage("Network error. Please try again.");
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus("LOADING");
    setResendMsg("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setResendStatus("ERROR");
        setResendMsg(json.error || "Resend failed. Please check the email address.");
        return;
      }

      if (json.verificationToken) {
        setResendToken(json.verificationToken);
      }
      setResendStatus("SENT");
    } catch {
      setResendStatus("ERROR");
      setResendMsg("Network error. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Email Verification</h2>
        <p className="text-xs text-slate-400">Verifying your digital identity email ownership</p>
      </div>

      {status === "VERIFYING" && (
        <div className="py-8 text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-400" />
          <p className="text-sm font-medium text-slate-300">Verifying your email address…</p>
        </div>
      )}

      {status === "SUCCESS" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Email Verified!</h3>
          <p className="text-xs text-slate-300">
            Your email address has been verified successfully. Your account is now active and ready for sign in.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-2xl bg-brand-600 py-3 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-glow-sm"
          >
            Proceed to Sign In →
          </Link>
        </div>
      )}

      {(status === "ERROR" || (!token && status === "IDLE")) && (
        <div className="space-y-6">
          {status === "ERROR" && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Request New Verification Email
            </h4>

            {resendStatus === "SENT" ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 space-y-2">
                <p className="text-xs text-emerald-300">
                  Verification email sent! Please check your inbox.
                </p>
                {resendToken && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20">
                    <p className="text-[11px] text-slate-400 mb-1">Development mode instant link:</p>
                    <Link
                      href={`/verify-email?token=${resendToken}`}
                      className="block text-center text-xs font-bold text-brand-400 hover:underline"
                    >
                      Verify Now →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                {resendMsg && <p className="text-xs text-red-400">{resendMsg}</p>}
                <div>
                  <label htmlFor="resend-email" className="block text-xs font-semibold text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="resend-email"
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resendStatus === "LOADING"}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors disabled:opacity-60"
                >
                  {resendStatus === "LOADING" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Resend Verification Email</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-slate-400">
        <Link href="/login" className="flex items-center justify-center gap-1 font-semibold text-brand-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-400">
          Loading email verification...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
