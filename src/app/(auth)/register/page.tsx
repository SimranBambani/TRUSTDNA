"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound } from "lucide-react";

// Password strength rules shown to the user
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least one number", test: (p: string) => /[0-9]/.test(p) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: PASSWORD_RULES.length }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i < passed ? colors[passed] : "bg-slate-700"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${passed >= 4 ? "text-emerald-400" : "text-slate-400"}`}>
        {labels[passed]}
      </p>
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? "text-emerald-400" : "text-slate-500"}`}>
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  function validate(): string | null {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!email.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    const failedRules = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failedRules.length > 0) return `Password must include: ${failedRules.map((r) => r.label.toLowerCase()).join(", ")}.`;
    if (password !== confirmPassword) return "Passwords do not match.";
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Registration failed. Please try again.");
        return;
      }

      if (json.verificationToken) {
        setVerificationToken(json.verificationToken);
      }
      setRegistered(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Account Created!</h2>
        <p className="text-xs text-slate-300">
          We have sent a verification link to <strong className="text-white">{email}</strong>. Please verify your email to activate your account.
        </p>

        {verificationToken && (
          <div className="rounded-2xl border border-brand-500/30 bg-brand-950/30 p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-brand-300 text-xs font-bold">
              <KeyRound className="h-4 w-4" />
              <span>Development Email Verification Link</span>
            </div>
            <p className="text-xs text-slate-400">Click below to activate your account instantly:</p>
            <Link
              href={`/verify-email?token=${verificationToken}`}
              className="block w-full text-center rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-glow-sm"
            >
              Verify Email Address Now →
            </Link>
          </div>
        )}

        <div className="pt-2">
          <Link
            href="/login"
            className="text-xs font-semibold text-brand-400 hover:underline"
          >
            Return to Sign In Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Create TrustDNA Account</h2>
        <p className="text-xs text-slate-400">Establish your digital identity &amp; trust score profile</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-firstname" className="block text-xs font-semibold text-slate-400 mb-1">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="reg-firstname"
                type="text"
                autoComplete="given-name"
                required
                placeholder="Simran"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-lastname" className="block text-xs font-semibold text-slate-400 mb-1">
              Last Name
            </label>
            <input
              id="reg-lastname"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Singh"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setError(""); }}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-2.5 px-4 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-400 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="reg-email"
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

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-400 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Min. 8 chars, uppercase, number…"
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
          <PasswordStrengthIndicator password={password} />
        </div>

        <div>
          <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-400 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="reg-confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className={`w-full rounded-2xl border bg-slate-950/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors ${
                confirmPassword && confirmPassword !== password
                  ? "border-red-500/60 focus:border-red-500"
                  : confirmPassword && confirmPassword === password
                  ? "border-emerald-500/60 focus:border-emerald-500"
                  : "border-slate-800 focus:border-brand-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
          )}
        </div>

        <button
          id="register-submit"
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-glow-sm hover:from-brand-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-400 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
