"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  // Client-side validation before hitting the server
  function validate(): string | null {
    if (!email.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 1) return "Password cannot be empty.";
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(mfaChallenge ? "/api/auth/mfa/verify" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: mfaChallenge ? JSON.stringify({ tempToken: mfaChallenge, code: mfaCode || undefined, recoveryCode: recoveryCode || undefined }) : JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Login failed. Please check your credentials.");
        return;
      }

      if (json.mfaRequired) {
        setMfaChallenge(json.tempToken);
        setError("");
        return;
      }

      // Real JWT cookie is set by the server — navigate to dashboard
      window.location.href = "/dashboard";
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
        <h2 className="text-2xl font-bold text-white">Sign In to TrustDNA</h2>
        <p className="text-xs text-slate-400">Access your digital identity &amp; verifiable credential hub</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mfaChallenge ? <>
          <p className="text-sm text-slate-300">Enter the 6-digit code from your authenticator app, or use a recovery code.</p>
          <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 px-4 text-sm text-white" />
          <input value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} autoComplete="off" placeholder="Recovery code (optional)" className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 px-4 text-sm text-white" />
        </> : <>
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@organization.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-400">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-brand-400 hover:underline">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        </>}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-glow-sm hover:from-brand-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-brand-400 hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  );
}
