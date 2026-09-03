"use client";

import { useEffect, useState } from "react";
import { TrustScoreWidget } from "@/components/trust/TrustScoreWidget";
import { ActivityFeed } from "@/components/trust/ActivityFeed";

export default function TrustScorePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/trust/score"), fetch("/api/trust/events")]).then(async ([scoreResponse, eventsResponse]) => {
      if (!scoreResponse.ok || !eventsResponse.ok) throw new Error();
      const [score, events] = await Promise.all([scoreResponse.json(), eventsResponse.json()]);
      setData({ score: score.data.score, events: events.data });
    }).catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Trust Score Engine & Ledger</h1>
        <p className="text-sm text-slate-400 mt-1">
          Detailed breakdown of your score calculation, decay factors, and historical event timeline.
        </p>
      </div>

      {error ? <p className="rounded-xl border border-rose-500/30 p-5 text-sm text-rose-300">Unable to load trust data.</p> : !data ? <p className="py-12 text-center text-sm text-slate-400">Loading trust data...</p> : <>
        <TrustScoreWidget {...data.score} />
        <ActivityFeed events={data.events} />
      </>}
    </div>
  );
}
