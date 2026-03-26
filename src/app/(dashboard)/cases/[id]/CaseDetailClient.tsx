"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Loader2, UserPlus, X, Mail, Phone, User, CheckCircle, AlertCircle, Users } from "lucide-react";
import ClientSelector, { type ClientSelectorClient } from "@/components/ui/ClientSelector";

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Props {
  caseId: string;
  clients?: ClientInfo[];
}

export default function CaseDetailClient({ caseId, clients = [] }: Props) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteTab, setInviteTab] = useState<"master" | "new">("master");

  async function handleArchive() {
    if (!confirm("Archive this case? It will be hidden from active cases.")) return;
    setArchiving(true);
    try {
      await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      router.push("/cases");
    } catch {
      setArchiving(false);
    }
  }

  function openInviteModal() {
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    setInviteSuccess("");
    setInviteError("");
    setInviteTab("master");
    setShowInviteModal(true);
  }

  function handleClientFromMaster(client: ClientSelectorClient | null) {
    if (!client) return;
    setInviteName(client.name);
    setInviteEmail(client.email);
    if (client.phone) setInvitePhone(client.phone);
    setInviteTab("new"); // switch to form tab so they can review & submit
  }

  async function handleInviteClient(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      const res = await fetch(`/api/cases/${caseId}/invite-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          phone: invitePhone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error ?? "Failed to invite client");
        return;
      }

      setInviteSuccess(`${inviteName} has been invited. A welcome email with portal access link has been sent to ${inviteEmail}.`);
      // Refresh page after short delay to show new client
      setTimeout(() => {
        setShowInviteModal(false);
        router.refresh();
      }, 2500);
    } catch {
      setInviteError("Failed to send invite. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={openInviteModal}
          className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Client
        </button>
        <a
          href={`/cases/${caseId}/edit`}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit
        </a>
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {archiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Archive
        </button>
      </div>

      {/* Invite Client Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !inviting && setShowInviteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Add Client to Case</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Client will receive a welcome email with portal login link.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                disabled={inviting}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Already linked clients */}
            {clients.length > 0 && (
              <div className="mb-5 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-2">Already linked:</p>
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    {c.name} — {c.email}
                  </div>
                ))}
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setInviteTab("master")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  inviteTab === "master" ? "bg-white shadow text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                From Master
              </button>
              <button
                type="button"
                onClick={() => setInviteTab("new")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  inviteTab === "new" ? "bg-white shadow text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Create New
              </button>
            </div>

            {inviteTab === "master" && (
              <div className="space-y-4">
                <ClientSelector onClientSelected={handleClientFromMaster} label="Search clients" />
                <p className="text-xs text-gray-400 text-center">Select a client to pre-fill the invite form</p>
              </div>
            )}

            <form onSubmit={handleInviteClient} className={`space-y-4 ${inviteTab === "master" && !inviteName ? "hidden" : ""}`}>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g., Ramesh Kumar"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={inviting}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="client@example.com"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={inviting}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="10-digit Indian mobile"
                    pattern="[6-9][0-9]{9}"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={inviting}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Indian mobile (6–9 followed by 9 digits)</p>
              </div>

              {/* Success */}
              {inviteSuccess && (
                <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {inviteSuccess}
                </div>
              )}

              {/* Error */}
              {inviteError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {inviteError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !!inviteSuccess}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#152d4a] transition-colors disabled:opacity-50"
                >
                  {inviting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Invite & Send Email</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
