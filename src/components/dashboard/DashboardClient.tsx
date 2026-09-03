"use client";

import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/trust/ActivityFeed";
import { FraudAlertsPanel } from "@/components/dashboard/FraudAlertsPanel";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TrustScoreWidget } from "@/components/trust/TrustScoreWidget";
import { formatRelativeTime } from "@/lib/utils";

type DashboardData = {
  profile: {
    user: { firstName: string; lastName: string; emailVerified: boolean; role: string };
    verificationRequests: Array<{ status: string }>;
  };
  trust: { score: { score: number; tier: string; identityScore: number; credentialScore: number; behaviorScore: number; fraudPenalty: number } | null };
  credentials: Array<{ id: string; credentialType: string; status: string; claims: Record<string, unknown>; signedJwt: string; issuedAt: string; expiresAt?: string | null; issuer: { firstName: string; lastName: string }; organization: { name: string } }>;
  events: Array<{ id: string; eventType: string; category: string; scoreDelta: number; reason: string; occurredAt: string }>;
  notifications: Array<{ id: string; title: string; body: string; status: string; category: string; createdAt: string }>;
  fraud: Array<{ id: string; action: string; timestamp: string; metadata: unknown }>;
  kyc: { status: string } | null;
  organizations: Array<{ organization: { id: string; name: string; slug: string }; role: string }>;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Unable to load dashboard data");
  return body.data;
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getJson<DashboardData["profile"]>("/api/identity"),
      getJson<DashboardData["trust"]>("/api/trust/score"),
      getJson<DashboardData["credentials"]>("/api/credentials"),
      getJson<DashboardData["events"]>("/api/trust/events"),
      getJson<DashboardData["notifications"]>("/api/notifications"),
      getJson<DashboardData["fraud"]>("/api/fraud"),
      getJson<DashboardData["kyc"]>("/api/kyc/status"),
      getJson<DashboardData["organizations"]>("/api/org"),
    ])
      .then(([profile, trust, credentials, events, notifications, fraud, kyc, organizations]) =>
        setData({ profile, trust, credentials, events, notifications, fraud, kyc, organizations })
      )
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data"));
  }, []);

  if (error) {
    return <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-sm text-rose-200">{error}</div>;
  }

  if (!data) {
    return <div className="space-y-6"><div className="h-10 w-72 animate-pulse rounded bg-slate-800" /><div className="h-52 animate-pulse rounded-3xl bg-slate-900" /><div className="h-48 animate-pulse rounded-3xl bg-slate-900" /></div>;
  }

  const user = data.profile.user;
  const score = data.trust.score;
  const verificationStatus = data.kyc?.status || data.profile.verificationRequests[0]?.status || "NOT_STARTED";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Identity Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Welcome back, <span className="font-semibold text-slate-200">{user.firstName} {user.lastName}</span>.</p>
        <p className="mt-2 text-xs text-slate-400">Verification status: <span className="font-semibold text-slate-200">{verificationStatus.replace(/_/g, " ")}</span></p>
      </div>

      {score ? <TrustScoreWidget score={score.score} tier={score.tier} identityScore={score.identityScore} credentialScore={score.credentialScore} behaviorScore={score.behaviorScore} fraudPenalty={score.fraudPenalty} /> : <EmptyState message="Trust score is not available yet." />}
      <QuickActions />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ActivityFeed events={data.events} />
        <FraudAlertsPanel alerts={data.fraud} />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold text-white">Your Credentials</h2>
          {data.credentials.length === 0 ? <EmptyState message="No credentials yet." /> : <div className="mt-4 space-y-3">{data.credentials.slice(0, 5).map((credential) => <div key={credential.id} className="flex items-center justify-between border-b border-slate-800 pb-3"><div><p className="text-sm font-semibold text-white">{credential.credentialType}</p><p className="text-xs text-slate-400">Issued by {credential.organization.name}</p></div><span className="text-xs text-slate-400">{credential.status}</span></div>)}</div>}
        </section>
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold text-white">Recent Notifications</h2>
          {data.notifications.length === 0 ? <EmptyState message="No notifications yet." /> : <div className="mt-4 space-y-3">{data.notifications.slice(0, 5).map((notification) => <div key={notification.id} className="border-b border-slate-800 pb-3"><p className="text-sm font-semibold text-white">{notification.title}</p><p className="text-xs text-slate-400">{notification.body}</p><p className="mt-1 text-[10px] text-slate-500">{formatRelativeTime(notification.createdAt)}</p></div>)}</div>}
        </section>
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold text-white">Organizations</h2>
          {data.organizations.length === 0 ? <EmptyState message="You do not belong to an organization yet." /> : <div className="mt-4 space-y-3">{data.organizations.map((membership) => <div key={membership.organization.id} className="flex justify-between border-b border-slate-800 pb-3"><span className="text-sm font-semibold text-white">{membership.organization.name}</span><span className="text-xs text-slate-400">{membership.role}</span></div>)}</div>}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">{message}</p>;
}
