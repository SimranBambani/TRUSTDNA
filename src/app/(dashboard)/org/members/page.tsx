import { MemberTable } from "@/components/org/MemberTable";

export default function OrgMembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Organization Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage team members, verifier privileges, and access roles.
        </p>
      </div>

      <MemberTable />
    </div>
  );
}
