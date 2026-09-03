import { MfaSettings } from "@/components/auth/MfaSettings";
import { prisma } from "@/lib/db";
import { requireServerSession } from "@/lib/server-session";

export default async function SettingsPage() {
  const session = await requireServerSession();
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { mfaEnabled: true } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Account Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your security preferences and authenticator settings.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6 max-w-2xl">
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white pb-2 border-b border-slate-800">Security & Authentication</h3>

          <MfaSettings enabled={user?.mfaEnabled ?? false} />

        </div>
      </div>
    </div>
  );
}
