import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Sign In | TrustDNA",
  description: "Sign in to your TrustDNA account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500/30">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
