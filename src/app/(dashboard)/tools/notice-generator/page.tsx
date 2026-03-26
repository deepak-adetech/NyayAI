"use client";
import { useState, useCallback } from "react";
import {
  FileSignature,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import VoiceDictation from "@/components/ui/VoiceDictation";
import CaseSelector, { type CaseSelectorCase } from "@/components/ui/CaseSelector";

/* ------------------------------------------------------------------ */
/*  Notice type definitions                                           */
/* ------------------------------------------------------------------ */

const NOTICE_TYPES = [
  { value: "CHEQUE_BOUNCE", label: "Cheque Bounce", description: "Notice under Section 138 NI Act for dishonoured cheques" },
  { value: "LANDLORD_EVICTION", label: "Landlord Eviction", description: "Eviction notice from landlord to tenant" },
  { value: "TENANT_NOTICE", label: "Tenant Notice", description: "Notice from tenant to landlord" },
  { value: "RECOVERY_OF_MONEY", label: "Recovery of Money", description: "Legal demand for recovery of outstanding dues" },
  { value: "EMPLOYMENT_TERMINATION", label: "Employment Termination", description: "Notice regarding termination of employment" },
  { value: "DEFAMATION", label: "Defamation", description: "Notice for defamatory statements or publications" },
  { value: "CONSUMER_COMPLAINT", label: "Consumer Complaint", description: "Notice under Consumer Protection Act" },
  { value: "PROPERTY_DISPUTE", label: "Property Dispute", description: "Notice related to property ownership or possession" },
  { value: "INSURANCE_CLAIM", label: "Insurance Claim", description: "Notice for insurance claim settlement" },
  { value: "GENERAL", label: "General Notice", description: "General-purpose legal notice" },
] as const;

type NoticeType = (typeof NOTICE_TYPES)[number]["value"];

const NOTICE_TYPE_BY_CASE: Record<string, string[]> = {
  CRIMINAL: ["CHEQUE_BOUNCE", "DEFAMATION", "RECOVERY_OF_MONEY", "GENERAL"],
  CIVIL: ["LANDLORD_EVICTION", "TENANT_NOTICE", "RECOVERY_OF_MONEY", "PROPERTY_DISPUTE", "GENERAL"],
  FAMILY: ["GENERAL"],
  CONSUMER: ["CONSUMER_COMPLAINT", "INSURANCE_CLAIM", "GENERAL"],
  LABOUR: ["EMPLOYMENT_TERMINATION", "GENERAL"],
  TAX: ["GENERAL"],
  WRIT: ["GENERAL"],
  ARBITRATION: ["GENERAL"],
  OTHER: ["CHEQUE_BOUNCE", "LANDLORD_EVICTION", "TENANT_NOTICE", "RECOVERY_OF_MONEY", "EMPLOYMENT_TERMINATION", "DEFAMATION", "CONSUMER_COMPLAINT", "PROPERTY_DISPUTE", "INSURANCE_CLAIM", "GENERAL"],
};

interface FormData {
  /* Common fields */
  senderName: string;
  senderAddress: string;
  senderAdvocate: string;
  senderBarCouncil: string;
  recipientName: string;
  recipientAddress: string;
  facts: string;
  demand: string;
  timelineDays: number;
  additionalPoints: string;
  /* Cheque bounce */
  chequeNumber: string;
  chequeDate: string;
  chequeAmount: string;
  bankName: string;
  dishonourDate: string;
  dishonourReason: string;
  /* Landlord / Tenant */
  propertyAddress: string;
  rentAmount: string;
  arrearsPeriod: string;
  /* Employment */
  employeeName: string;
  employeeDesignation: string;
  terminationDate: string;
  /* Defamation */
  defamationDetails: string;
  /* Consumer */
  productDetails: string;
  purchaseDate: string;
  claimAmount: string;
  /* Insurance */
  policyNumber: string;
}

const initialForm: FormData = {
  senderName: "",
  senderAddress: "",
  senderAdvocate: "",
  senderBarCouncil: "",
  recipientName: "",
  recipientAddress: "",
  facts: "",
  demand: "",
  timelineDays: 15,
  additionalPoints: "",
  chequeNumber: "",
  chequeDate: "",
  chequeAmount: "",
  bankName: "",
  dishonourDate: "",
  dishonourReason: "",
  propertyAddress: "",
  rentAmount: "",
  arrearsPeriod: "",
  employeeName: "",
  employeeDesignation: "",
  terminationDate: "",
  defamationDetails: "",
  productDetails: "",
  purchaseDate: "",
  claimAmount: "",
  policyNumber: "",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NoticeGeneratorPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [noticeType, setNoticeType] = useState<NoticeType | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedCaseType, setSelectedCaseType] = useState<string>("");

  function handleCaseSelected(c: CaseSelectorCase | null) {
    if (c) {
      setSelectedCaseType(c.caseType ?? "");
      if (c.petitionerAdvocates?.[0]) updateField("senderAdvocate", c.petitionerAdvocates[0]);
      if (c.respondentNames?.[0]) updateField("recipientName", c.respondentNames[0]);
      if (c.clients?.[0]?.client?.name) updateField("senderName", c.clients[0].client.name);
    } else {
      setSelectedCaseType("");
    }
  }

  /* ---- helpers ---- */

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const validateForm = useCallback((): string | null => {
    if (!form.senderName.trim()) return "Sender name is required.";
    if (!form.senderAddress.trim()) return "Sender address is required.";
    if (!form.recipientName.trim()) return "Recipient name is required.";
    if (!form.recipientAddress.trim()) return "Recipient address is required.";
    if (!form.facts.trim()) return "Facts are required.";
    if (!form.demand.trim()) return "Demand / relief sought is required.";
    if (form.timelineDays < 1) return "Timeline must be at least 1 day.";

    if (noticeType === "CHEQUE_BOUNCE") {
      if (!form.chequeNumber.trim()) return "Cheque number is required.";
      if (!form.chequeDate) return "Cheque date is required.";
      if (!form.chequeAmount.trim()) return "Cheque amount is required.";
      if (!form.bankName.trim()) return "Bank name is required.";
      if (!form.dishonourDate) return "Dishonour date is required.";
      if (!form.dishonourReason.trim()) return "Dishonour reason is required.";
    }
    if (noticeType === "LANDLORD_EVICTION" || noticeType === "TENANT_NOTICE") {
      if (!form.propertyAddress.trim()) return "Property address is required.";
      if (!form.rentAmount.trim()) return "Rent amount is required.";
      if (!form.arrearsPeriod.trim()) return "Arrears period is required.";
    }
    if (noticeType === "EMPLOYMENT_TERMINATION") {
      if (!form.employeeName.trim()) return "Employee name is required.";
      if (!form.employeeDesignation.trim()) return "Employee designation is required.";
      if (!form.terminationDate) return "Termination date is required.";
    }
    if (noticeType === "DEFAMATION") {
      if (!form.defamationDetails.trim()) return "Defamation details are required.";
    }
    if (noticeType === "CONSUMER_COMPLAINT") {
      if (!form.productDetails.trim()) return "Product / service details are required.";
      if (!form.purchaseDate) return "Purchase date is required.";
      if (!form.claimAmount.trim()) return "Claim amount is required.";
    }
    if (noticeType === "INSURANCE_CLAIM") {
      if (!form.policyNumber.trim()) return "Policy number is required.";
      if (!form.claimAmount.trim()) return "Claim amount is required.";
    }
    return null;
  }, [form, noticeType]);

  const handleGenerate = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    setStep(3);

    try {
      const res = await fetch("/api/tools/notice-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeType, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate notice.");
        setStep(2);
        return;
      }
      setResult(data.notice ?? data.result ?? "");
      setStep(4);
    } catch {
      setError("Network error. Please try again.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  }, [form, noticeType, validateForm]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
      const ta = document.createElement("textarea");
      ta.value = result;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  /* ---- shared input helpers ---- */

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const renderInput = (
    label: string,
    key: keyof FormData,
    opts?: { type?: string; placeholder?: string; required?: boolean },
  ) => (
    <div key={key}>
      <label className={labelClass}>
        {label}
        {opts?.required !== false && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={form[key] as string}
        onChange={(e) => updateField(key, e.target.value as never)}
        placeholder={opts?.placeholder}
        className={inputClass}
      />
    </div>
  );

  const renderTextarea = (
    label: string,
    key: keyof FormData,
    opts?: { placeholder?: string; required?: boolean; rows?: number; withVoice?: boolean },
  ) => (
    <div key={key}>
      <label className={labelClass}>
        {label}
        {opts?.required !== false && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <textarea
          value={form[key] as string}
          onChange={(e) => updateField(key, e.target.value as never)}
          placeholder={opts?.placeholder}
          rows={opts?.rows ?? 4}
          className={`${inputClass} resize-y ${opts?.withVoice ? "pr-12" : ""}`}
        />
        {opts?.withVoice && (
          <div className="absolute top-2 right-2">
            <VoiceDictation
              onTranscript={(text) =>
                updateField(key, ((form[key] as string) ? (form[key] as string) + " " + text : text) as never)
              }
            />
          </div>
        )}
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Step 1 — Select notice type                                       */
  /* ------------------------------------------------------------------ */

  const renderStep1 = () => {
    const availableTypes = selectedCaseType && NOTICE_TYPE_BY_CASE[selectedCaseType]
      ? NOTICE_TYPES.filter((t) => NOTICE_TYPE_BY_CASE[selectedCaseType].includes(t.value))
      : NOTICE_TYPES;

    return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Choose the type of legal notice you want to generate.
      </p>
      {selectedCaseType && (
        <p className="text-xs text-blue-600 mb-3">Showing notice types applicable to {selectedCaseType} cases</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableTypes.map((nt) => (
          <button
            key={nt.value}
            onClick={() => {
              setNoticeType(nt.value);
              setStep(2);
              setError("");
            }}
            className={`text-left p-4 rounded-xl border transition-all hover:shadow-md ${
              noticeType === nt.value
                ? "border-[#1e3a5f] bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="font-semibold text-gray-800 text-sm">{nt.label}</p>
            <p className="text-xs text-gray-500 mt-1">{nt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
  };

  /* ------------------------------------------------------------------ */
  /*  Step 2 — Dynamic form                                             */
  /* ------------------------------------------------------------------ */

  const renderTypeSpecificFields = () => {
    switch (noticeType) {
      case "CHEQUE_BOUNCE":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
              Cheque Details
            </h3>
            {renderInput("Cheque Number", "chequeNumber", { placeholder: "e.g. 123456" })}
            {renderInput("Cheque Date", "chequeDate", { type: "date" })}
            {renderInput("Cheque Amount (\u20B9)", "chequeAmount", { placeholder: "e.g. 50000" })}
            {renderInput("Bank Name", "bankName", { placeholder: "e.g. State Bank of India" })}
            {renderInput("Dishonour Date", "dishonourDate", { type: "date" })}
            {renderInput("Dishonour Reason", "dishonourReason", {
              placeholder: "e.g. Insufficient funds",
            })}
          </>
        );
      case "LANDLORD_EVICTION":
      case "TENANT_NOTICE":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
              Property &amp; Rent Details
            </h3>
            {renderInput("Property Address", "propertyAddress", {
              placeholder: "Full address of the rented property",
            })}
            {renderInput("Monthly Rent (\u20B9)", "rentAmount", { placeholder: "e.g. 15000" })}
            {renderInput("Arrears Period", "arrearsPeriod", {
              placeholder: "e.g. Jan 2025 - Mar 2025",
            })}
          </>
        );
      case "EMPLOYMENT_TERMINATION":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
              Employment Details
            </h3>
            {renderInput("Employee Name", "employeeName", { placeholder: "Full name of employee" })}
            {renderInput("Designation", "employeeDesignation", {
              placeholder: "e.g. Senior Engineer",
            })}
            {renderInput("Termination Date", "terminationDate", { type: "date" })}
          </>
        );
      case "DEFAMATION":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
              Defamation Details
            </h3>
            <div className="col-span-full">
              {renderTextarea("Details of Defamatory Statement", "defamationDetails", {
                placeholder:
                  "Describe the defamatory statement, where it was published/said, date, and impact",
                rows: 4,
              })}
            </div>
          </>
        );
      case "CONSUMER_COMPLAINT":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
              Consumer Complaint Details
            </h3>
            {renderInput("Product / Service Details", "productDetails", {
              placeholder: "e.g. Samsung Galaxy S24 Ultra",
            })}
            {renderInput("Purchase Date", "purchaseDate", { type: "date" })}
            {renderInput("Claim Amount (\u20B9)", "claimAmount", { placeholder: "e.g. 100000" })}
          </>
        );
      case "INSURANCE_CLAIM":
        return (
          <>
            <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
              Insurance Claim Details
            </h3>
            {renderInput("Policy Number", "policyNumber", { placeholder: "e.g. LIC-12345678" })}
            {renderInput("Claim Amount (\u20B9)", "claimAmount", { placeholder: "e.g. 500000" })}
          </>
        );
      default:
        return null;
    }
  };

  const renderStep2 = () => (
    <div>
      <button
        onClick={() => {
          setStep(1);
          setError("");
        }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Change notice type
      </button>

      <p className="text-sm text-gray-500 mb-4">
        Fill in the details for your{" "}
        <span className="font-semibold text-gray-700">
          {NOTICE_TYPES.find((n) => n.value === noticeType)?.label}
        </span>{" "}
        notice.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sender info */}
        <h3 className="text-sm font-semibold text-gray-700 col-span-full">Sender (Your) Details</h3>
        {renderInput("Full Name", "senderName", { placeholder: "Your full name" })}
        {renderInput("Address", "senderAddress", { placeholder: "Your complete address" })}
        {renderInput("Advocate Name", "senderAdvocate", {
          placeholder: "Name of advocate (if any)",
          required: false,
        })}
        {renderInput("Bar Council Number", "senderBarCouncil", {
          placeholder: "Bar Council enrollment no.",
          required: false,
        })}

        {/* Recipient info */}
        <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
          Recipient Details
        </h3>
        {renderInput("Full Name", "recipientName", { placeholder: "Recipient full name" })}
        {renderInput("Address", "recipientAddress", { placeholder: "Recipient complete address" })}

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}

        {/* Facts & demand */}
        <h3 className="text-sm font-semibold text-gray-700 col-span-full mt-2">
          Notice Content
        </h3>
        <div className="col-span-full">
          {renderTextarea("Facts of the Case", "facts", {
            placeholder: "Describe the facts and circumstances leading to this notice...",
            rows: 5,
            withVoice: true,
          })}
        </div>
        <div className="col-span-full">
          {renderTextarea("Demand / Relief Sought", "demand", {
            placeholder: "State what you demand from the recipient...",
            rows: 3,
          })}
        </div>
        <div>
          <label className={labelClass}>
            Timeline (Days) <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.timelineDays}
            onChange={(e) => updateField("timelineDays", parseInt(e.target.value) || 15)}
            className={inputClass}
          />
        </div>
        <div className="col-span-full">
          {renderTextarea("Additional Points", "additionalPoints", {
            placeholder: "Any additional points you want to include (optional)",
            rows: 3,
            required: false,
          })}
        </div>
      </div>

      {/* Generate button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152d4a] disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Generate Notice
        </button>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Step 3 — Loading                                                   */
  /* ------------------------------------------------------------------ */

  const renderStep3 = () => (
    <div className="text-center py-16">
      <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f] mx-auto mb-4" />
      <p className="text-sm text-gray-500">Generating your legal notice...</p>
      <p className="text-xs text-gray-400 mt-1">This may take a few seconds.</p>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Step 4 — Result                                                    */
  /* ------------------------------------------------------------------ */

  const renderStep4 = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Notice Generated Successfully</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStep(2);
              setResult("");
              setError("");
            }}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Edit &amp; Regenerate
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#152d4a] rounded-lg flex items-center gap-2 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-auto max-h-[70vh]">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-[Georgia,serif] leading-relaxed">
          {result}
        </pre>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={() => {
            setStep(1);
            setNoticeType(null);
            setForm(initialForm);
            setResult("");
            setError("");
          }}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Generate Another Notice
        </button>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Main render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-[#1e3a5f]" />
          Legal Notice Generator
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Draft a professional legal notice by filling in the required details. The AI will format it
          as per Indian legal standards.
        </p>
      </div>

      {/* Auto-fill from Case */}
      <CaseSelector onCaseSelected={handleCaseSelected} className="mb-5" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {[
          { num: 1, label: "Select Type" },
          { num: 2, label: "Fill Details" },
          { num: 3, label: "Generate" },
          { num: 4, label: "Result" },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                step >= s.num
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step >= s.num ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {idx < 3 && (
              <div
                className={`w-8 h-0.5 ${
                  step > s.num ? "bg-[#1e3a5f]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
}
