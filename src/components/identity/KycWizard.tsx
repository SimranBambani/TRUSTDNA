"use client";

import { useState, useEffect } from "react";
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Camera,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  XCircle,
  HelpCircle,
} from "lucide-react";

export function KycWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 Form state
  const [firstName, setFirstName] = useState("Simran");
  const [lastName, setLastName] = useState("Architect");
  const [dateOfBirth, setDateOfBirth] = useState("1992-05-14");
  const [nationality, setNationality] = useState("US");
  const [countryOfResidence, setCountryOfResidence] = useState("US");

  // Step 2 Form state
  const [docType, setDocType] = useState<"PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE">("PASSPORT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docUploaded, setDocUploaded] = useState(false);

  // Step 3 Form state
  // Final submission state
  const [finalDecision, setFinalDecision] = useState<any>(null);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const res = await fetch("/api/kyc/status");
      const json = await res.json();
      if (res.ok && json.data) {
        if (json.data.personalIdentity) {
          setFirstName(json.data.personalIdentity.firstName);
          setLastName(json.data.personalIdentity.lastName);
          const dobDate = new Date(json.data.personalIdentity.dateOfBirth);
          if (!isNaN(dobDate.getTime())) {
            setDateOfBirth(dobDate.toISOString().split("T")[0]);
          }
          setNationality(json.data.personalIdentity.nationality);
          setCountryOfResidence(json.data.personalIdentity.countryOfResidence);
        }
        if (json.data.documentsCount > 0) setDocUploaded(true);
        if (["VERIFIED", "REJECTED", "NEEDS_MANUAL_REVIEW"].includes(json.data.status)) {
          setFinalDecision(json.data);
        }
      }
    } catch {
      // Ignore initial status fetch error
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/kyc/personal-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth,
          nationality,
          countryOfResidence,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save personal information.");
        return;
      }

      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !docUploaded) {
      setError("Please select an identity document file to upload.");
      return;
    }

    if (!selectedFile && docUploaded) {
      setStep(3);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile!);
      formData.append("docType", docType);

      const res = await fetch("/api/kyc/document/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Document upload failed.");
        return;
      }

      setDocUploaded(true);
      setStep(3);
    } catch {
      setError("Network error during document upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Initiate liveness session
      const livenessRes = await fetch("/api/kyc/liveness/session", { method: "POST" });
      const livenessJson = await livenessRes.json();
      if (!livenessRes.ok) {
        setError(livenessJson.error || "Liveness session failed.");
        return;
      }
      // 2. Trigger automated decision engine
      const submitRes = await fetch("/api/kyc/submit", { method: "POST" });
      const submitJson = await submitRes.json();
      if (!submitRes.ok) {
        setError(submitJson.error || "Automated verification decision failed.");
        return;
      }

      setFinalDecision(submitJson.data);
    } catch {
      setError("Network error during verification submission.");
    } finally {
      setLoading(false);
    }
  };

  if (finalDecision) {
    const isVerified = finalDecision.status === "VERIFIED" || finalDecision.decision === "VERIFIED";
    const isReview = finalDecision.status === "NEEDS_MANUAL_REVIEW" || finalDecision.decision === "NEEDS_MANUAL_REVIEW";

    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 backdrop-blur-xl shadow-2xl space-y-6 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${
            isVerified
              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
              : isReview
              ? "border-amber-500/30 bg-amber-500/20 text-amber-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="h-10 w-10" />
          ) : isReview ? (
            <HelpCircle className="h-10 w-10" />
          ) : (
            <XCircle className="h-10 w-10" />
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold text-white">
            {isVerified ? "Verification Approved!" : isReview ? "Manual Review Required" : "Verification Declined"}
          </h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            {isVerified
              ? "Your digital identity has been verified through our automated KYC risk engine. Trust Score +200 points awarded."
              : isReview
              ? "Your verification submitted successfully and is queued for manual inspection by our KYC Compliance team."
              : "Verification declined due to document inconsistency or security signal policy."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs space-y-2 text-left">
          <div className="flex justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Verification ID:</span>
            <span className="font-mono font-semibold text-white">{finalDecision.id || "Unavailable"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">Status:</span>
            <span className={`font-bold ${isVerified ? "text-emerald-400" : isReview ? "text-amber-400" : "text-red-400"}`}>
              {finalDecision.status || finalDecision.decision}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Timestamp:</span>
            <span className="text-slate-300">
              {new Date(finalDecision.completedAt || Date.now()).toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setFinalDecision(null); setStep(1); }}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          View Verification Details
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl">
      {/* Progress Bar Stepper */}
      <div className="flex items-center justify-between pb-8 border-b border-slate-800">
        {[
          { num: 1, label: "Personal Info" },
          { num: 2, label: "Document Upload" },
          { num: 3, label: "Biometric Liveness" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                step === s.num
                  ? "bg-brand-600 text-white shadow-glow-sm"
                  : step > s.num
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {step > s.num ? <CheckCircle2 className="h-5 w-5" /> : s.num}
            </div>
            <span className={`hidden sm:inline text-xs font-semibold ${step === s.num ? "text-white" : "text-slate-500"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Personal Info Form */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 1: Confirm Personal Identity Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="kyc-firstname" className="block text-xs font-semibold text-slate-400 mb-1">
                  Legal First Name
                </label>
                <input
                  id="kyc-firstname"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="kyc-lastname" className="block text-xs font-semibold text-slate-400 mb-1">
                  Legal Last Name
                </label>
                <input
                  id="kyc-lastname"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="kyc-dob" className="block text-xs font-semibold text-slate-400 mb-1">
                Date of Birth (Min. 18 years)
              </label>
              <input
                id="kyc-dob"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="kyc-nationality" className="block text-xs font-semibold text-slate-400 mb-1">
                  Nationality (Country Code)
                </label>
                <select
                  id="kyc-nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none transition-colors"
                >
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="IN">India (IN)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="DE">Germany (DE)</option>
                </select>
              </div>

              <div>
                <label htmlFor="kyc-country" className="block text-xs font-semibold text-slate-400 mb-1">
                  Country of Residence
                </label>
                <select
                  id="kyc-country"
                  value={countryOfResidence}
                  onChange={(e) => setCountryOfResidence(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none transition-colors"
                >
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="IN">India (IN)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="DE">Germany (DE)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-6 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-500 shadow-glow-sm transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <span>Next: Document Upload</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Document Upload Form */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 2: Upload Identity Document</h3>

            <div className="grid grid-cols-3 gap-3">
              {(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`rounded-2xl border p-3 text-center transition-all ${
                    docType === t
                      ? "border-brand-500 bg-brand-500/10 text-white font-bold"
                      : "border-slate-800 bg-slate-950/40 text-slate-400"
                  }`}
                >
                  <FileText className="mx-auto h-5 w-5 mb-1" />
                  <span className="text-xs uppercase">{t.replace("_", " ")}</span>
                </button>
              ))}
            </div>

            <label className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950/50 py-10 hover:border-brand-500/50 transition-all cursor-pointer">
              <UploadCloud className="h-10 w-10 text-brand-400 mb-2" />
              <p className="text-sm font-semibold text-white">
                {selectedFile ? selectedFile.name : "Click or drag document file here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, PDF up to 10MB (Magic bytes inspected)</p>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setError("");
                  }
                }}
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-500 shadow-glow-sm transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning & Uploading…</span>
                </>
              ) : (
                <>
                  <span>Next: Biometric Liveness</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Biometric Liveness Form */}
      {step === 3 && (
        <form onSubmit={handleStep3Submit} className="mt-8 space-y-6 text-center">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Step 3: Biometric Liveness Verification</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Initiating secure biometric liveness check through the identity verification provider.
            </p>

            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border-4 border-dashed border-brand-500/40 bg-slate-950 relative overflow-hidden">
              <Camera className="h-12 w-12 text-brand-400" />
              <div className="absolute inset-0 bg-brand-500/10 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:from-brand-500 hover:to-emerald-500 shadow-glow-sm transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing KYC Decision…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Complete Automated KYC Check</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
