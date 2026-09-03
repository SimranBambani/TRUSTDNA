import { MemberTable } from "@/components/org/MemberTable";
import { ApiKeyManager } from "@/components/org/ApiKeyManager";
import { OrganizationSetup } from "@/components/org/OrganizationSetup";

export default function OrgPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Organization Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your enterprise trust profile, team members, and API credentials.
        </p>
      </div>

      <OrganizationSetup />
      <MemberTable />
      <ApiKeyManager />
    </div>
  );
}
