"use client";
import { useState, useCallback } from "react";
import {
  PenTool,
  FileText,
  FileCheck,
  ScrollText,
  Reply,
  Gavel,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle,
} from "lucide-react";
import VoiceDictation from "@/components/ui/VoiceDictation";
import CaseSelector, { type CaseSelectorCase } from "@/components/ui/CaseSelector";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabId = "plaint" | "written-statement" | "petition" | "reply" | "appeal";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface AppealAnalysis {
  orderSummary?: string;
  keyFindings?: string[];
  legalErrors?: string[];
  factualErrors?: string[];
  proceduralErrors?: string[];
}

interface AppealResult {
  analysis?: AppealAnalysis;
  memo?: string;
}

const TABS: TabDef[] = [
  { id: "plaint", label: "Plaint", icon: <FileText className="h-4 w-4" /> },
  { id: "written-statement", label: "Written Statement", icon: <FileCheck className="h-4 w-4" /> },
  { id: "petition", label: "Petition", icon: <ScrollText className="h-4 w-4" /> },
  { id: "reply", label: "Reply / Objection", icon: <Reply className="h-4 w-4" /> },
  { id: "appeal", label: "Grounds of Appeal", icon: <Gavel className="h-4 w-4" /> },
];

const JURISDICTIONS = [
  "District Court",
  "Sessions Court",
  "High Court",
  "Supreme Court",
  "Consumer Forum",
  "Tribunal",
  "Family Court",
];

const CASE_TYPES = [
  "Criminal",
  "Civil",
  "Family",
  "Consumer",
  "Labour",
  "Tax",
  "Writ",
  "Arbitration",
];

const PETITION_TYPES = ["Writ", "Criminal Misc", "Civil Revision", "Other"];

/* ------------------------------------------------------------------ */
/*  Reusable small components                                          */
/* ------------------------------------------------------------------ */

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] outline-none transition"
    />
  );
}

function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
  onVoice,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  onVoice?: boolean;
}) {
  return (
    <div>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] outline-none transition resize-y"
        />
        {onVoice && (
          <div className="absolute top-2 right-2">
            <VoiceDictation
              onTranscript={(text) => onChange(value ? value + " " + text : text)}
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition"
            />
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] outline-none transition bg-white"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function DraftGeneratorPage() {
  const [activeTab, setActiveTab] = useState<TabId>("plaint");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftResult, setDraftResult] = useState("");
  const [appealResult, setAppealResult] = useState<AppealResult | null>(null);
  const [copied, setCopied] = useState(false);

  // ---------- Common fields ----------
  const [courtName, setCourtName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [caseType, setCaseType] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [plaintiffName, setPlaintiffName] = useState("");
  const [plaintiffAddress, setPlaintiffAddress] = useState("");
  const [plaintiffFatherName, setPlaintiffFatherName] = useState("");
  const [defendantName, setDefendantName] = useState("");
  const [defendantAddress, setDefendantAddress] = useState("");
  const [defendantFatherName, setDefendantFatherName] = useState("");
  const [advocateName, setAdvocateName] = useState("");
  const [advocateBarCouncil, setAdvocateBarCouncil] = useState("");

  // ---------- Plaint ----------
  const [causeOfAction, setCauseOfAction] = useState("");
  const [dateOfCauseOfAction, setDateOfCauseOfAction] = useState("");
  const [reliefSought, setReliefSought] = useState("");
  const [suitValuation, setSuitValuation] = useState("");
  const [courtFees, setCourtFees] = useState("");
  const [supportingFacts, setSupportingFacts] = useState("");

  // ---------- Written Statement ----------
  const [paraByParaResponse, setParaByParaResponse] = useState("");
  const [preliminaryObjections, setPreliminaryObjections] = useState("");
  const [additionalPleas, setAdditionalPleas] = useState("");
  const [counterClaim, setCounterClaim] = useState("");

  // ---------- Petition ----------
  const [petitionType, setPetitionType] = useState("");
  const [petitionGrounds, setPetitionGrounds] = useState("");
  const [petitionPrayer, setPetitionPrayer] = useState("");
  const [urgencyGrounds, setUrgencyGrounds] = useState("");

  // ---------- Reply / Objection ----------
  const [replyToApplication, setReplyToApplication] = useState("");
  const [replyPoints, setReplyPoints] = useState("");

  // ---------- Appeal ----------
  const [orderText, setOrderText] = useState("");
  const [appealCaseType, setAppealCaseType] = useState("");
  const [appellantName, setAppellantName] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [courtOfAppeal, setCourtOfAppeal] = useState("");
  const [trialCourt, setTrialCourt] = useState("");
  const [appealCaseNumber, setAppealCaseNumber] = useState("");
  const [appealAdvocateName, setAppealAdvocateName] = useState("");

  function handleCaseSelected(c: CaseSelectorCase | null) {
    if (!c) return;
    if (c.courtName) setCourtName(c.courtName);
    if (c.courtDistrict || c.courtState) {
      const loc = [c.courtDistrict, c.courtState].filter(Boolean).join(", ");
      const match = JURISDICTIONS.find((j) => c.courtName?.toLowerCase().includes(j.toLowerCase()));
      setJurisdiction(match ?? loc);
    }
    if (c.caseType) {
      const typeMap: Record<string, string> = { CRIMINAL: "Criminal", CIVIL: "Civil", FAMILY: "Family", CONSUMER: "Consumer", LABOUR: "Labour", TAX: "Tax", WRIT: "Writ", ARBITRATION: "Arbitration" };
      setCaseType(typeMap[c.caseType] ?? c.caseType);
    }
    if (c.caseNumber) setCaseNumber(c.caseNumber);
    if (c.petitionerNames?.[0]) setPlaintiffName(c.petitionerNames[0]);
    if (c.respondentNames?.[0]) setDefendantName(c.respondentNames[0]);
    if (c.petitionerAdvocates?.[0]) setAdvocateName(c.petitionerAdvocates[0]);
    // Also fill appeal tab
    if (c.petitionerNames?.[0]) setAppellantName(c.petitionerNames[0]);
    if (c.respondentNames?.[0]) setRespondentName(c.respondentNames[0]);
    if (c.courtName) setTrialCourt(c.courtName);
    if (c.caseNumber) setAppealCaseNumber(c.caseNumber);
    if (c.petitionerAdvocates?.[0]) setAppealAdvocateName(c.petitionerAdvocates[0]);
  }

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError("");
    setDraftResult("");
    setAppealResult(null);

    try {
      if (activeTab === "appeal") {
        if (!orderText.trim()) {
          setError("Please paste the trial court order text.");
          return;
        }
        const res = await fetch("/api/tools/appeal-generator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderText: orderText.trim(),
            caseType: appealCaseType,
            appellantName: appellantName.trim(),
            respondentName: respondentName.trim(),
            courtOfAppeal: courtOfAppeal.trim(),
            trialCourt: trialCourt.trim() || undefined,
            caseNumber: appealCaseNumber.trim() || undefined,
            advocateName: appealAdvocateName.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to generate appeal grounds.");
          return;
        }
        setAppealResult({ analysis: data.analysis, memo: data.memo ?? data.draft });
      } else {
        // Common payload
        const common = {
          courtName: courtName.trim(),
          jurisdiction,
          caseType,
          caseNumber: caseNumber.trim() || undefined,
          plaintiffName: plaintiffName.trim(),
          plaintiffAddress: plaintiffAddress.trim(),
          plaintiffFatherName: plaintiffFatherName.trim() || undefined,
          defendantName: defendantName.trim(),
          defendantAddress: defendantAddress.trim(),
          defendantFatherName: defendantFatherName.trim() || undefined,
          advocateName: advocateName.trim() || undefined,
          advocateBarCouncil: advocateBarCouncil.trim() || undefined,
        };

        let tabPayload: Record<string, unknown> = {};
        let draftType = "";

        switch (activeTab) {
          case "plaint":
            draftType = "plaint";
            tabPayload = {
              causeOfAction: causeOfAction.trim(),
              dateOfCauseOfAction,
              reliefSought: reliefSought.trim(),
              suitValuation: suitValuation.trim(),
              courtFees: courtFees.trim(),
              supportingFacts: supportingFacts.trim(),
            };
            break;
          case "written-statement":
            draftType = "written_statement";
            tabPayload = {
              paraByParaResponse: paraByParaResponse.trim(),
              preliminaryObjections: preliminaryObjections.trim(),
              additionalPleas: additionalPleas.trim(),
              counterClaim: counterClaim.trim() || undefined,
            };
            break;
          case "petition":
            draftType = "petition";
            tabPayload = {
              petitionType,
              petitionGrounds: petitionGrounds.trim(),
              petitionPrayer: petitionPrayer.trim(),
              urgencyGrounds: urgencyGrounds.trim() || undefined,
            };
            break;
          case "reply":
            draftType = "reply_objection";
            tabPayload = {
              replyToApplication: replyToApplication.trim(),
              replyPoints: replyPoints.trim(),
            };
            break;
        }

        const res = await fetch("/api/tools/draft-generator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftType, ...common, ...tabPayload }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to generate draft.");
          return;
        }
        setDraftResult(data.draft ?? "");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    courtName,
    jurisdiction,
    caseType,
    caseNumber,
    plaintiffName,
    plaintiffAddress,
    plaintiffFatherName,
    defendantName,
    defendantAddress,
    defendantFatherName,
    advocateName,
    advocateBarCouncil,
    causeOfAction,
    dateOfCauseOfAction,
    reliefSought,
    suitValuation,
    courtFees,
    supportingFacts,
    paraByParaResponse,
    preliminaryObjections,
    additionalPleas,
    counterClaim,
    petitionType,
    petitionGrounds,
    petitionPrayer,
    urgencyGrounds,
    replyToApplication,
    replyPoints,
    orderText,
    appealCaseType,
    appellantName,
    respondentName,
    courtOfAppeal,
    trialCourt,
    appealCaseNumber,
    appealAdvocateName,
  ]);

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setError("");
    setDraftResult("");
    setAppealResult(null);
  };

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */

  const renderCommonFields = () => (
    <div className="space-y-6">
      {/* Court Details */}
      <fieldset>
        <legend className="text-sm font-semibold text-[#1e3a5f] mb-3">Court Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="courtName">Court Name *</Label>
            <TextInput id="courtName" value={courtName} onChange={setCourtName} placeholder="e.g. District Court, New Delhi" required />
          </div>
          <div>
            <Label htmlFor="jurisdiction">Jurisdiction *</Label>
            <SelectInput id="jurisdiction" value={jurisdiction} onChange={setJurisdiction} options={JURISDICTIONS} placeholder="Select Jurisdiction" />
          </div>
          <div>
            <Label htmlFor="caseType">Case Type *</Label>
            <SelectInput id="caseType" value={caseType} onChange={setCaseType} options={CASE_TYPES} placeholder="Select Case Type" />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <Label htmlFor="caseNumber">Case Number (optional)</Label>
          <TextInput id="caseNumber" value={caseNumber} onChange={setCaseNumber} placeholder="e.g. CS/123/2025" />
        </div>
      </fieldset>

      {/* Plaintiff */}
      <fieldset>
        <legend className="text-sm font-semibold text-[#1e3a5f] mb-3">Plaintiff / Petitioner</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="plaintiffName">Name *</Label>
            <TextInput id="plaintiffName" value={plaintiffName} onChange={setPlaintiffName} required />
          </div>
          <div>
            <Label htmlFor="plaintiffAddress">Address *</Label>
            <TextInput id="plaintiffAddress" value={plaintiffAddress} onChange={setPlaintiffAddress} required />
          </div>
          <div>
            <Label htmlFor="plaintiffFatherName">Father&apos;s Name (optional)</Label>
            <TextInput id="plaintiffFatherName" value={plaintiffFatherName} onChange={setPlaintiffFatherName} />
          </div>
        </div>
      </fieldset>

      {/* Defendant */}
      <fieldset>
        <legend className="text-sm font-semibold text-[#1e3a5f] mb-3">Defendant / Respondent</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="defendantName">Name *</Label>
            <TextInput id="defendantName" value={defendantName} onChange={setDefendantName} required />
          </div>
          <div>
            <Label htmlFor="defendantAddress">Address *</Label>
            <TextInput id="defendantAddress" value={defendantAddress} onChange={setDefendantAddress} required />
          </div>
          <div>
            <Label htmlFor="defendantFatherName">Father&apos;s Name (optional)</Label>
            <TextInput id="defendantFatherName" value={defendantFatherName} onChange={setDefendantFatherName} />
          </div>
        </div>
      </fieldset>

      {/* Advocate */}
      <fieldset>
        <legend className="text-sm font-semibold text-[#1e3a5f] mb-3">Advocate Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="advocateName">Advocate Name (optional)</Label>
            <TextInput id="advocateName" value={advocateName} onChange={setAdvocateName} />
          </div>
          <div>
            <Label htmlFor="advocateBarCouncil">Bar Council No. (optional)</Label>
            <TextInput id="advocateBarCouncil" value={advocateBarCouncil} onChange={setAdvocateBarCouncil} />
          </div>
        </div>
      </fieldset>
    </div>
  );

  const renderPlaintFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="causeOfAction">Cause of Action *</Label>
        <TextArea id="causeOfAction" value={causeOfAction} onChange={setCauseOfAction} placeholder="Describe the cause of action..." rows={4} onVoice />
      </div>
      <div className="max-w-xs">
        <Label htmlFor="dateOfCauseOfAction">Date of Cause of Action</Label>
        <input
          id="dateOfCauseOfAction"
          type="date"
          value={dateOfCauseOfAction}
          onChange={(e) => setDateOfCauseOfAction(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] outline-none transition"
        />
      </div>
      <div>
        <Label htmlFor="reliefSought">Relief Sought *</Label>
        <TextArea id="reliefSought" value={reliefSought} onChange={setReliefSought} placeholder="Describe the relief / prayer..." rows={3} onVoice />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="suitValuation">Suit Valuation</Label>
          <TextInput id="suitValuation" value={suitValuation} onChange={setSuitValuation} placeholder="e.g. Rs. 5,00,000" />
        </div>
        <div>
          <Label htmlFor="courtFees">Court Fees</Label>
          <TextInput id="courtFees" value={courtFees} onChange={setCourtFees} placeholder="e.g. Rs. 500" />
        </div>
      </div>
      <div>
        <Label htmlFor="supportingFacts">Supporting Facts</Label>
        <TextArea id="supportingFacts" value={supportingFacts} onChange={setSupportingFacts} placeholder="Additional facts supporting the plaint..." rows={4} onVoice />
      </div>
    </div>
  );

  const renderWrittenStatementFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="paraByParaResponse">Para-by-Para Response *</Label>
        <TextArea
          id="paraByParaResponse"
          value={paraByParaResponse}
          onChange={setParaByParaResponse}
          placeholder="Enter paragraph-by-paragraph response to plaint..."
          hint="Enter paragraph-by-paragraph response to plaint"
          rows={6}
          onVoice
        />
      </div>
      <div>
        <Label htmlFor="preliminaryObjections">Preliminary Objections *</Label>
        <TextArea id="preliminaryObjections" value={preliminaryObjections} onChange={setPreliminaryObjections} placeholder="List preliminary objections..." rows={4} onVoice />
      </div>
      <div>
        <Label htmlFor="additionalPleas">Additional Pleas *</Label>
        <TextArea id="additionalPleas" value={additionalPleas} onChange={setAdditionalPleas} placeholder="Enter additional pleas..." rows={4} onVoice />
      </div>
      <div>
        <Label htmlFor="counterClaim">Counter Claim (optional)</Label>
        <TextArea id="counterClaim" value={counterClaim} onChange={setCounterClaim} placeholder="Enter counter claim if any..." rows={3} onVoice />
      </div>
    </div>
  );

  const renderPetitionFields = () => (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="petitionType">Petition Type *</Label>
        <SelectInput id="petitionType" value={petitionType} onChange={setPetitionType} options={PETITION_TYPES} placeholder="Select Petition Type" />
      </div>
      <div>
        <Label htmlFor="petitionGrounds">Grounds *</Label>
        <TextArea id="petitionGrounds" value={petitionGrounds} onChange={setPetitionGrounds} placeholder="Enter grounds for the petition..." rows={5} onVoice />
      </div>
      <div>
        <Label htmlFor="petitionPrayer">Prayer *</Label>
        <TextArea id="petitionPrayer" value={petitionPrayer} onChange={setPetitionPrayer} placeholder="Enter the prayer / relief sought..." rows={3} onVoice />
      </div>
      <div>
        <Label htmlFor="urgencyGrounds">Urgency Grounds (optional)</Label>
        <TextArea id="urgencyGrounds" value={urgencyGrounds} onChange={setUrgencyGrounds} placeholder="Explain urgency if interim relief is sought..." rows={3} onVoice />
      </div>
    </div>
  );

  const renderReplyFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="replyToApplication">Application Summary *</Label>
        <TextArea
          id="replyToApplication"
          value={replyToApplication}
          onChange={setReplyToApplication}
          placeholder="Summarize the application you are replying to..."
          hint="Summarize the application you are replying to"
          rows={5}
          onVoice
        />
      </div>
      <div>
        <Label htmlFor="replyPoints">Reply Points *</Label>
        <TextArea id="replyPoints" value={replyPoints} onChange={setReplyPoints} placeholder="Enter your reply points..." rows={5} onVoice />
      </div>
    </div>
  );

  const renderAppealFields = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="orderText">Trial Court Order / Judgment Text *</Label>
        <TextArea
          id="orderText"
          value={orderText}
          onChange={setOrderText}
          placeholder="Paste the trial court order/judgment text here..."
          rows={10}
          onVoice
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="appealCaseType">Case Type *</Label>
          <SelectInput id="appealCaseType" value={appealCaseType} onChange={setAppealCaseType} options={CASE_TYPES} placeholder="Select Case Type" />
        </div>
        <div>
          <Label htmlFor="courtOfAppeal">Court of Appeal *</Label>
          <TextInput id="courtOfAppeal" value={courtOfAppeal} onChange={setCourtOfAppeal} placeholder="e.g. High Court of Delhi" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="appellantName">Appellant Name *</Label>
          <TextInput id="appellantName" value={appellantName} onChange={setAppellantName} required />
        </div>
        <div>
          <Label htmlFor="respondentName">Respondent Name *</Label>
          <TextInput id="respondentName" value={respondentName} onChange={setRespondentName} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="trialCourt">Trial Court (optional)</Label>
          <TextInput id="trialCourt" value={trialCourt} onChange={setTrialCourt} placeholder="e.g. District Court, Saket" />
        </div>
        <div>
          <Label htmlFor="appealCaseNumber">Case Number (optional)</Label>
          <TextInput id="appealCaseNumber" value={appealCaseNumber} onChange={setAppealCaseNumber} placeholder="e.g. CrlA/45/2025" />
        </div>
        <div>
          <Label htmlFor="appealAdvocateName">Advocate Name (optional)</Label>
          <TextInput id="appealAdvocateName" value={appealAdvocateName} onChange={setAppealAdvocateName} />
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === "appeal") return renderAppealFields();

    return (
      <div className="space-y-8">
        {renderCommonFields()}
        <hr className="border-gray-200" />
        <div>
          <h3 className="text-sm font-semibold text-[#1e3a5f] mb-4">
            {activeTab === "plaint" && "Plaint Details"}
            {activeTab === "written-statement" && "Written Statement Details"}
            {activeTab === "petition" && "Petition Details"}
            {activeTab === "reply" && "Reply / Objection Details"}
          </h3>
          {activeTab === "plaint" && renderPlaintFields()}
          {activeTab === "written-statement" && renderWrittenStatementFields()}
          {activeTab === "petition" && renderPetitionFields()}
          {activeTab === "reply" && renderReplyFields()}
        </div>
      </div>
    );
  };

  const renderErrorList = (errors: string[] | undefined, label: string, color: string) => {
    if (!errors || errors.length === 0) return null;
    const colorMap: Record<string, string> = {
      red: "bg-red-50 border-red-200 text-red-800",
      amber: "bg-amber-50 border-amber-200 text-amber-800",
      blue: "bg-blue-50 border-blue-200 text-blue-800",
    };
    const dotMap: Record<string, string> = {
      red: "bg-red-500",
      amber: "bg-amber-500",
      blue: "bg-blue-500",
    };
    return (
      <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${dotMap[color]}`} />
          {label} ({errors.length})
        </h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderAppealAnalysis = () => {
    if (!appealResult?.analysis) return null;
    const a = appealResult.analysis;
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#1e3a5f]">Order Analysis</h3>
        {a.orderSummary && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
            <h4 className="font-semibold mb-1 text-gray-800">Order Summary</h4>
            <p>{a.orderSummary}</p>
          </div>
        )}
        {a.keyFindings && a.keyFindings.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
            <h4 className="font-semibold mb-1 text-gray-800">Key Findings</h4>
            <ul className="list-disc list-inside space-y-1">
              {a.keyFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-3">
          {renderErrorList(a.legalErrors, "Legal Errors", "red")}
          {renderErrorList(a.factualErrors, "Factual Errors", "amber")}
          {renderErrorList(a.proceduralErrors, "Procedural Errors", "blue")}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (activeTab === "appeal" && appealResult) {
      const fullText = [
        appealResult.analysis?.orderSummary,
        appealResult.memo,
      ]
        .filter(Boolean)
        .join("\n\n");

      return (
        <div className="space-y-6 mt-8">
          {renderAppealAnalysis()}
          {appealResult.memo && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1e3a5f]">Appeal Memorandum</h3>
                <button
                  onClick={() => copyToClipboard(fullText)}
                  className="flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:text-[#2c5282] transition"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy All"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                {appealResult.memo}
              </pre>
            </div>
          )}
        </div>
      );
    }

    if (draftResult) {
      return (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1e3a5f]">Generated Draft</h3>
            <button
              onClick={() => copyToClipboard(draftResult)}
              className="flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:text-[#2c5282] transition"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            {draftResult}
          </pre>
        </div>
      );
    }

    return null;
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PenTool className="h-6 w-6 text-[#1e3a5f]" />
          Legal Draft Generator
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate professional legal drafts, petitions, written statements, and appeal grounds with AI assistance.
        </p>
      </div>

      {/* Auto-fill from Case */}
      <CaseSelector onCaseSelected={handleCaseSelected} className="mb-5" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white text-[#1e3a5f] shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {renderTabContent()}

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="mt-6">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg font-medium text-sm hover:bg-[#2c5282] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : activeTab === "appeal" ? (
              <>
                <Gavel className="h-4 w-4" />
                Analyze &amp; Generate
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" />
                Generate Draft
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {renderResults()}
    </div>
  );
}
