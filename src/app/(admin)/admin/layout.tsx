import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Panel" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside id="admin-sidebar" className="w-64 border-r border-white/10">
        {/* AdminNav component */}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
