import { ApiKeyManager } from "@/components/org/ApiKeyManager";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">API Keys & Tokens</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage API keys for automated credential verification & webhook delivery.
        </p>
      </div>

      <ApiKeyManager />
    </div>
  );
}
