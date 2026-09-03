"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";

export function OrganizationSetup() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/org").then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      setHasOrganization((body.data || []).length > 0);
    }).catch(() => setHasOrganization(false));
  }, []);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to create organization");
      window.location.reload();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create organization");
      setSaving(false);
    }
  }

  if (hasOrganization) return null;

  return (
    <form onSubmit={createOrganization} className="rounded-3xl border border-brand-500/30 bg-slate-900/70 p-6 space-y-4">
      <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-brand-400" /><div><h2 className="text-base font-bold text-white">Set up an organization</h2><p className="text-xs text-slate-400">Create an organization to issue credentials and manage API keys.</p></div></div>
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2"><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Organization name" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" /><input required minLength={2} pattern="[a-z0-9-]+" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="organization-slug" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" /></div>
      <button disabled={saving} type="submit" className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Creating..." : "Create organization"}</button>
    </form>
  );
}
