import { FraudAlertsPanel } from "@/components/dashboard/FraudAlertsPanel";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Platform Administration Console</h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor system health, review high-risk fraud signals, and manage global trust policies.
        </p>
      </div>

      <FraudAlertsPanel />
    </div>
  );
}
