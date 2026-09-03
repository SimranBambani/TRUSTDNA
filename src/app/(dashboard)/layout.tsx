import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500/30">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 shrink-0 lg:block border-r border-slate-800">
        <Sidebar />
      </aside>

      {/* Main View Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
