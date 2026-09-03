"use client";

import { useState } from "react";

export function MfaSettings({ enabled }: { enabled: boolean }) {
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, body?: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "MFA request failed");
    return result.data;
  }

  async function setup() {
    setBusy(true); setError("");
    try { const data = await request("/api/auth/mfa/setup"); setQrCode(data.qrCodeDataUrl); setMessage("Scan this QR code with your authenticator app, then confirm it below."); }
    catch (setupError) { setError(setupError instanceof Error ? setupError.message : "MFA setup failed"); }
    finally { setBusy(false); }
  }

  async function confirm() {
    setBusy(true); setError("");
    try { const data = await request("/api/auth/mfa/confirm", { code }); setRecoveryCodes(data.recoveryCodes); setQrCode(""); setMessage("MFA enabled. Store these recovery codes securely; they will not be shown again."); }
    catch (confirmError) { setError(confirmError instanceof Error ? confirmError.message : "MFA confirmation failed"); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError("");
    try { await request("/api/auth/mfa/disable", { password, code }); setMessage("MFA disabled successfully."); setPassword(""); setCode(""); }
    catch (disableError) { setError(disableError instanceof Error ? disableError.message : "MFA disable failed"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between py-2">
      <div><span className="block text-sm font-bold text-white">Multi-Factor Authentication</span><span className="text-xs text-slate-400">Use Google Authenticator, Microsoft Authenticator, or another TOTP app.</span></div>
      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">{enabled ? "Enabled" : "Not enabled"}</span>
    </div>
    {error && <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">{error}</p>}
    {message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">{message}</p>}
    {!enabled && !qrCode && <button disabled={busy} onClick={setup} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Set up authenticator</button>}
    {qrCode && <div className="space-y-3"><img src={qrCode} alt="MFA authenticator setup QR code" className="h-48 w-48 rounded-xl bg-white p-2" /><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="Enter 6-digit code" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /><button disabled={busy} onClick={confirm} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm MFA</button></div>}
    {recoveryCodes.length > 0 && <pre className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs tracking-widest text-amber-200">{recoveryCodes.join("\n")}</pre>}
    {enabled && <div className="space-y-3 border-t border-slate-800 pt-4"><p className="text-xs text-slate-400">Disabling MFA requires your password and a current authenticator code.</p><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Account password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="Current 6-digit code" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /><button disabled={busy} onClick={disable} className="rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-300 disabled:opacity-50">Disable MFA</button></div>}
  </div>;
}
