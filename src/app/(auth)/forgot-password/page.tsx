"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to process request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
        <p className="text-xs text-slate-400">Enter your account email to generate a secure reset link</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-glow-sm hover:from-brand-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending reset request…</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 text-center space-y-2">
            <h4 className="text-sm font-bold text-emerald-300">Password Reset Requested!</h4>
            <p className="text-xs text-slate-300">
              If an account with <strong className="text-white">{email}</strong> exists, password reset instructions will be sent to that address.
            </p>
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
