import { KycWizard } from "@/components/identity/KycWizard";

export default function KycVerifyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Identity Verification (KYC)</h1>
        <p className="text-sm text-slate-400 mt-1">
          Establish verifiable identity by uploading passport/ID documents and biometric check.
        </p>
      </div>

      <KycWizard />
    </div>
  );
}
