"use client";
import { useState, useCallback } from "react";
import {
  Shield,
  Loader2,
  AlertCircle,
  Copy,
  Plus,
  X,
  CheckCircle,
  Info,
} from "lucide-react";
import VoiceDictation from "@/components/ui/VoiceDictation";
import CaseSelector, { type CaseSelectorCase } from "@/components/ui/CaseSelector";

type BailType = "REGULAR" | "ANTICIPATORY";
type CourtType = "SESSIONS" | "HIGH_COURT" | "MAGISTRATE";

const COMMON_GROUNDS = [
  "No prior criminal record",
  "Cooperation with investigation",
  "Roots in community",
  "Sole breadwinner of family",
  "Serious illness/medical condition",
  "Prolonged incarceration without trial",
  "Co-accused already granted bail",
  "Complainant has been compromised",
  "No likelihood of tampering with evidence",
  "No flight risk",
] as const;

export default function BailDrafterPage() {
  // Form state
  const [bailType, setBailType] = useState<BailType>("REGULAR");
  const [courtType, setCourtType] = useState<CourtType>("SESSIONS");
  const [courtName, setCourtName] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [offenceDate, setOffenceDate] = useState("");
  const [sectionsCharged, setSectionsCharged] = useState<string[]>([]);
  const [sectionInput, setSectionInput] = useState("");
  const [caseNumber, setCaseNumber] = useState("");

  // Accused details
  const [accusedName, setAccusedName] = useState("");
  const [accusedFatherName, setAccusedFatherName] = useState("");
  const [accusedAge, setAccusedAge] = useState("");
  const [accusedOccupation, setAccusedOccupation] = useState("");
  const [accusedAddress, setAccusedAddress] = useState("");

  // Custody / co-accused
  const [arrestDate, setArrestDate] = useState("");
  const [custodyDuration, setCustodyDuration] = useState("");
  const [coAccusedBailStatus, setCoAccusedBailStatus] = useState("");

  // Grounds
  const [selectedGrounds, setSelectedGrounds] = useState<string[]>([]);
  const [customGrounds, setCustomGrounds] = useState("");
  const [additionalFacts, setAdditionalFacts] = useState("");

  // Advocate
  const [advocateName, setAdvovateName] = useState("");
  const [advocateBarCouncil, setAdvocateBarCouncil] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCaseSelected(c: CaseSelectorCase | null) {
    if (!c) return;
    if (c.firNumber) setFirNumber(c.firNumber);
    if (c.policeStation) setPoliceStation(c.policeStation);
    if (c.courtName) {
      setCourtName(c.courtName);
      if (c.courtName.toLowerCase().includes("high court")) setCourtType("HIGH_COURT");
      else if (c.courtName.toLowerCase().includes("sessions")) setCourtType("SESSIONS");
      else setCourtType("MAGISTRATE");
    }
    if (c.courtDistrict) setDistrict(c.courtDistrict);
    if (c.courtState) setState(c.courtState);
    if (c.caseNumber) setCaseNumber(c.caseNumber);
    const sections = [
      ...(c.bnsSections ?? []).map((s: string) => `BNS ${s}`),
      ...(c.ipcSections ?? []).map((s: string) => `IPC ${s}`),
      ...(c.otherSections ?? []),
    ];
    if (sections.length > 0) setSectionsCharged(sections);
    if (c.respondentNames?.[0]) setAccusedName(c.respondentNames[0]);
    if (c.petitionerAdvocates?.[0]) setAdvovateName(c.petitionerAdvocates[0]);
  }

  const addSection = useCallback(() => {
    const trimmed = sectionInput.trim();
    if (trimmed && !sectionsCharged.includes(trimmed)) {
      setSectionsCharged((prev) => [...prev, trimmed]);
      setSectionInput("");
    }
  }, [sectionInput, sectionsCharged]);

  const removeSection = useCallback((section: string) => {
    setSectionsCharged((prev) => prev.filter((s) => s !== section));
  }, []);

  const toggleGround = useCallback((ground: string) => {
    setSelectedGrounds((prev) =>
      prev.includes(ground)
        ? prev.filter((g) => g !== ground)
        : [...prev, ground]
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    // Basic validation
    if (!courtName.trim() || !firNumber.trim() || !accusedName.trim()) {
      setError("Please fill in court name, FIR number, and accused name at minimum.");
      return;
    }
    if (sectionsCharged.length === 0) {
      setError("Please add at least one section charged.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    const allGrounds = [
      ...selectedGrounds,
      ...(customGrounds.trim() ? [customGrounds.trim()] : []),
    ];

    try {
      const res = await fetch("/api/tools/bail-drafter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bailType,
          courtType,
          courtName: courtName.trim(),
          firNumber: firNumber.trim(),
          policeStation: policeStation.trim(),
          district: district.trim(),
          state: state.trim(),
          offenceDate: offenceDate || undefined,
          sectionsCharged,
          caseNumber: caseNumber.trim() || undefined,
          accusedName: accusedName.trim(),
          accusedFatherName: accusedFatherName.trim(),
          accusedAge: accusedAge.trim(),
          accusedOccupation: accusedOccupation.trim() || undefined,
          accusedAddress: accusedAddress.trim(),
          arrestDate: arrestDate || undefined,
          custodyDuration: custodyDuration.trim() || undefined,
          coAccusedBailStatus: coAccusedBailStatus.trim() || undefined,
          groundsForBail: allGrounds,
          additionalFacts: additionalFacts.trim() || undefined,
          advocateName: advocateName.trim() || undefined,
          advocateBarCouncil: advocateBarCouncil.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate bail application.");
        return;
      }
      setResult(data.application ?? data.result ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    bailType, courtType, courtName, firNumber, policeStation, district, state,
    offenceDate, sectionsCharged, caseNumber, accusedName, accusedFatherName,
    accusedAge, accusedOccupation, accusedAddress, arrestDate, custodyDuration,
    coAccusedBailStatus, selectedGrounds, customGrounds, additionalFacts,
    advocateName, advocateBarCouncil,
  ]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = result;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#1e3a5f]" />
          Bail Application Drafter
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate a professional bail application draft based on case details. Review and customize before filing.
        </p>
      </div>

      {/* Auto-fill from Case */}
      <CaseSelector onCaseSelected={handleCaseSelected} className="mb-5" />

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold mb-1">BNS/BNSS vs IPC/CrPC Transition</p>
            <p>
              Offences committed <strong>before 1 July 2024</strong> are governed by IPC 1860 and CrPC 1973
              (bail under Sections 436/437/438 CrPC).
            </p>
            <p>
              Offences committed <strong>on or after 1 July 2024</strong> are governed by BNS 2023 and BNSS 2023
              (bail under Sections 478/479/480/482 BNSS).
            </p>
            <p className="mt-1">
              The <strong>date of offence</strong> determines which law applies. Please enter the offence date accurately
              so the correct legal provisions are cited in your application.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Bail Type & Court */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Bail Type & Court Details</h2>

          {/* Bail Type Toggle */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Bail Type</label>
            <div className="flex gap-2">
              {(["REGULAR", "ANTICIPATORY"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBailType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bailType === type
                      ? "bg-[#1e3a5f] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {type === "REGULAR" ? "Regular Bail" : "Anticipatory Bail"}
                </button>
              ))}
            </div>
          </div>

          {/* Court Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Court Type</label>
              <select
                value={courtType}
                onChange={(e) => setCourtType(e.target.value as CourtType)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="SESSIONS">Sessions Court</option>
                <option value="HIGH_COURT">High Court</option>
                <option value="MAGISTRATE">Magistrate Court</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Court Name</label>
              <input
                type="text"
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                placeholder="e.g., District & Sessions Court, Patiala House"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* FIR & Case Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">FIR & Case Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">FIR Number *</label>
              <input
                type="text"
                value={firNumber}
                onChange={(e) => setFirNumber(e.target.value)}
                placeholder="e.g., 123/2024"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Police Station</label>
              <input
                type="text"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                placeholder="e.g., Saket Police Station"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g., South Delhi"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., Delhi"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Offence</label>
              <input
                type="date"
                value={offenceDate}
                onChange={(e) => setOffenceDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Sections Charged */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Sections Charged *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={sectionInput}
                onChange={(e) => setSectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSection();
                  }
                }}
                placeholder="e.g., 302 IPC or 103 BNS"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={addSection}
                disabled={!sectionInput.trim()}
                className="px-4 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {sectionsCharged.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sectionsCharged.map((section) => (
                  <span
                    key={section}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                  >
                    {section}
                    <button
                      type="button"
                      onClick={() => removeSection(section)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Case Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Case Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., Bail Application No. 1234/2024"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Accused Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Accused Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Accused Name *</label>
              <input
                type="text"
                value={accusedName}
                onChange={(e) => setAccusedName(e.target.value)}
                placeholder="Full name of the accused"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Father&apos;s Name</label>
              <input
                type="text"
                value={accusedFatherName}
                onChange={(e) => setAccusedFatherName(e.target.value)}
                placeholder="Father's name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Age</label>
              <input
                type="text"
                value={accusedAge}
                onChange={(e) => setAccusedAge(e.target.value)}
                placeholder="e.g., 35"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Occupation <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={accusedOccupation}
                onChange={(e) => setAccusedOccupation(e.target.value)}
                placeholder="e.g., Business, Service, Student"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <textarea
              value={accusedAddress}
              onChange={(e) => setAccusedAddress(e.target.value)}
              placeholder="Complete residential address of the accused"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Custody & Co-Accused */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Custody & Co-Accused Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date of Arrest <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={arrestDate}
                onChange={(e) => setArrestDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Custody Duration <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={custodyDuration}
                onChange={(e) => setCustodyDuration(e.target.value)}
                placeholder="e.g., 45 days, 3 months"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Co-Accused Bail Status <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={coAccusedBailStatus}
              onChange={(e) => setCoAccusedBailStatus(e.target.value)}
              placeholder="Details of bail granted to any co-accused persons in this case"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Grounds for Bail */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Grounds for Bail</h2>

          {/* Common Grounds Checkboxes */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Select applicable grounds</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {COMMON_GROUNDS.map((ground) => (
                <label
                  key={ground}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    selectedGrounds.includes(ground)
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGrounds.includes(ground)}
                    onChange={() => toggleGround(ground)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedGrounds.includes(ground)
                        ? "bg-[#1e3a5f] border-[#1e3a5f]"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {selectedGrounds.includes(ground) && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-xs">{ground}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Grounds */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Additional Grounds <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <textarea
                value={customGrounds}
                onChange={(e) => setCustomGrounds(e.target.value)}
                placeholder="Any additional grounds not listed above..."
                rows={3}
                className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <div className="absolute right-2 top-2">
                <VoiceDictation
                  onTranscript={(text) =>
                    setCustomGrounds((prev) => (prev ? prev + " " + text : text))
                  }
                />
              </div>
            </div>
          </div>

          {/* Additional Facts */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Additional Facts <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <textarea
                value={additionalFacts}
                onChange={(e) => setAdditionalFacts(e.target.value)}
                placeholder="Any additional facts relevant to the bail application, such as specific circumstances, medical conditions, family dependencies, etc."
                rows={4}
                className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <div className="absolute right-2 top-2">
                <VoiceDictation
                  onTranscript={(text) =>
                    setAdditionalFacts((prev) => (prev ? prev + " " + text : text))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advocate Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Advocate Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Advocate Name</label>
              <input
                type="text"
                value={advocateName}
                onChange={(e) => setAdvovateName(e.target.value)}
                placeholder="Name of the advocate"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Bar Council Enrollment No. <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={advocateBarCouncil}
                onChange={(e) => setAdvocateBarCouncil(e.target.value)}
                placeholder="e.g., D/1234/2020"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#152d4a] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Bail Application...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Generate Bail Application
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mt-5">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Generated Bail Application</h3>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-5">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {result}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
