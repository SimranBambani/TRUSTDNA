"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadKeys() {
    setLoading(true);
    try {
      const response = await fetch("/api/org/api-keys");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load API keys");
      setKeys(body.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadKeys(); }, []);

  async function createKey() {
    if (!name.trim()) { setError("Enter a name for this API key."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/org/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: ["credentials:read"] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create API key");
      setNewKey(body.data.rawKey);
      setName("");
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create API key");
    } finally {
      setSaving(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? This cannot be undone.")) return;
    const response = await fetch(`/api/org/api-keys/${id}`, { method: "DELETE" });
    if (!response.ok) { const body = await response.json(); setError(body.error || "Unable to revoke API key"); return; }
    await loadKeys();
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white">API Keys & Access Tokens</h3>
          <p className="text-xs text-slate-400">Manage machine-to-machine authentication tokens for partner integrations</p>
        </div>

        <button onClick={createKey} disabled={saving} className="flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-glow-sm hover:bg-brand-500 transition-all disabled:opacity-60">
          <Plus className="h-4 w-4" /> {saving ? "Creating..." : "Create New Secret Key"}
        </button>
      </div>

      <div className="flex gap-3">
        <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createKey(); }} placeholder="Key name, e.g. Partner integration" className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" />
      </div>

      {error && <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"><ShieldAlert className="h-4 w-4" />{error}</div>}

      {newKey && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-300"><KeyRound className="h-4 w-4" />Copy this key now. It will not be shown again.</div>
        <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-slate-950/80 p-3 text-xs text-slate-200">{newKey}</code><button onClick={copyKey} className="rounded-xl border border-slate-700 p-3 text-slate-300 hover:text-white" aria-label="Copy API key">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</button></div>
        <button onClick={() => setNewKey(null)} className="text-xs font-semibold text-amber-300 hover:text-amber-200">Dismiss secret</button>
      </div>}

      <div className="space-y-4">
        {loading ? <p className="py-8 text-center text-sm text-slate-400">Loading API keys...</p> : keys.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No API keys are currently stored for this organization.</p> : keys.map((key) => <div key={key.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-semibold text-white"><KeyRound className="h-4 w-4 text-brand-400" />{key.name}</div><p className="mt-1 font-mono text-xs text-slate-500">{key.keyPrefix}... · {key.scopes.join(", ")}</p></div>
          <div className="flex items-center gap-3"><span className={key.status === "ACTIVE" ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-slate-500"}>{key.status}</span>{key.status === "ACTIVE" && <button onClick={() => void revokeKey(key.id)} className="rounded-xl border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10" aria-label={`Revoke ${key.name}`}><Trash2 className="h-4 w-4" /></button>}</div>
        </div>)}
        {!loading && keys.length > 0 && <button onClick={() => void loadKeys()} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><RotateCcw className="h-3.5 w-3.5" />Refresh keys</button>}
      </div>
    </div>
  );
}
