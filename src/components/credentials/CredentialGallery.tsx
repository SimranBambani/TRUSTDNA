"use client";

import { useEffect, useState } from "react";
import { CredentialCard } from "./CredentialCard";
import { Plus, Search, Award, X } from "lucide-react";

type CredentialRecord = {
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

export function CredentialGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [subjectUserId, setSubjectUserId] = useState("");
  const [credentialType, setCredentialType] = useState("IdentityCredential");
  const [claimName, setClaimName] = useState("");
  const [claimValue, setClaimValue] = useState("");
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetch("/api/credentials")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load credentials");
        setCredentials(body.data.map((credential: any) => ({
          id: credential.id,
          type: credential.credentialType,
          issuer: credential.organization.name,
          subject: `${credential.issuer.firstName} ${credential.issuer.lastName}`,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          status: credential.status,
          claims: credential.claims || {},
          jwt: credential.signedJwt,
        })));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load credentials"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = credentials.filter((c) =>
    c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.issuer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function issueCredential(event: React.FormEvent) {
    event.preventDefault();
    setIssuing(true); setError("");
    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectUserId, credentialType, claims: { [claimName || "verifiedAttribute"]: claimValue || "verified" } }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to issue credential");
      setShowIssueForm(false); setSubjectUserId(""); setClaimName(""); setClaimValue("");
      setCredentials((current) => [body.data, ...current]);
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "Unable to issue credential");
    } finally { setIssuing(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search credentials by title or issuer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>

        <button onClick={() => setShowIssueForm(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm hover:from-brand-500 hover:to-indigo-500 transition-all">
          <Plus className="h-4 w-4" />
          <span>Issue New Credential</span>
        </button>
      </div>

      {showIssueForm && <form onSubmit={issueCredential} className="rounded-2xl border border-brand-500/30 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">Issue credential</h3><button type="button" onClick={() => setShowIssueForm(false)} aria-label="Close issue form" className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button></div>
        <input required value={subjectUserId} onChange={(event) => setSubjectUserId(event.target.value)} placeholder="Subject user UUID" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" />
        <input required value={credentialType} onChange={(event) => setCredentialType(event.target.value)} placeholder="Credential type" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" />
        <div className="grid grid-cols-2 gap-3"><input value={claimName} onChange={(event) => setClaimName(event.target.value)} placeholder="Claim name" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" /><input value={claimValue} onChange={(event) => setClaimValue(event.target.value)} placeholder="Claim value" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none" /></div>
        <button disabled={issuing} type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{issuing ? "Issuing..." : "Issue credential"}</button>
      </form>}

      {loading ? <p className="py-12 text-center text-sm text-slate-400">Loading credentials...</p> : error ? <p className="py-12 text-center text-sm text-rose-300">{error}</p> : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 py-16 text-center">
          <Award className="h-12 w-12 text-slate-600" />
          <h4 className="mt-3 text-base font-bold text-white">{credentials.length === 0 ? "No credentials yet." : "No Credentials Found"}</h4>
          <p className="mt-1 text-xs text-slate-400">{credentials.length === 0 ? "Credentials issued to you will appear here." : "No credentials match your search criteria."}</p>
        </div>
      )}
    </div>
  );
}
