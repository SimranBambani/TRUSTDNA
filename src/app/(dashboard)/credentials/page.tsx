import { CredentialGallery } from "@/components/credentials/CredentialGallery";

export default function CredentialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Verifiable Credentials</h1>
        <p className="text-sm text-slate-400 mt-1">
          View, issue, and manage signed cryptographic credentials.
        </p>
      </div>

      <CredentialGallery />
    </div>
  );
}
