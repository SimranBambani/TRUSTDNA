"use client";

import { useEffect, useState } from "react";
import { MoreVertical, Plus } from "lucide-react";

export function MemberTable() {
  const [members, setMembers] = useState<Array<any>>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/org/members").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load members");
      setMembers(body.data);
      setState("ready");
    }).catch(() => setState("error"));
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white">Organization Members</h3>
          <p className="text-xs text-slate-400">Manage user access roles and verifier privileges</p>
        </div>

        <button className="flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-glow-sm hover:bg-brand-500 transition-all">
          <Plus className="h-4 w-4" /> Invite Member
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Joined</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {state === "loading" ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading members...</td></tr> : state === "error" ? <tr><td colSpan={5} className="py-8 text-center text-rose-300">Unable to load members.</td></tr> : members.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">No organization members yet.</td></tr> : members.map((membership) => {
              const mem = { ...membership.user, role: membership.role, joined: membership.joinedAt };
              return (
              <tr key={mem.id} className="hover:bg-slate-950/40 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300 font-bold">
                      {mem.firstName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white block">{mem.firstName} {mem.lastName}</span>
                      <span className="text-slate-500 text-[11px]">{mem.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-300 border border-brand-500/20">
                    {mem.role}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    {mem.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{new Date(mem.joined).toLocaleDateString()}</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="text-slate-400 hover:text-white p-1">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
