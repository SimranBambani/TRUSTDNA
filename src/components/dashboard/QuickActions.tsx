"use client";

import Link from "next/link";
import { ShieldCheck, Award, Users, Key, ArrowRight } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Verify Identity",
      desc: "Start KYC document check",
      href: "/identity/verify",
      icon: ShieldCheck,
      color: "from-brand-600 to-indigo-600",
    },
    {
      title: "Issue Credential",
      desc: "Create W3C verifiable token",
      href: "/credentials",
      icon: Award,
      color: "from-amber-600 to-yellow-600",
    },
    {
      title: "Manage Org",
      desc: "Invite members & roles",
      href: "/org/members",
      icon: Users,
      color: "from-emerald-600 to-teal-600",
    },
    {
      title: "Generate API Key",
      desc: "Connect integrations",
      href: "/org/api-keys",
      icon: Key,
      color: "from-cyan-600 to-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Link
            key={act.title}
            href={act.href}
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr ${act.color} text-white shadow-md`}>
                <Icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white" />
            </div>

            <h4 className="mt-4 text-sm font-bold text-white">{act.title}</h4>
            <p className="mt-1 text-xs text-slate-400">{act.desc}</p>
          </Link>
        );
      })}
    </div>
  );
}
