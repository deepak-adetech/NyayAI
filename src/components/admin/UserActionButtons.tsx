"use client";

import { useState } from "react";
import { UserCog, Power, Calendar, RefreshCw } from "lucide-react";

interface Props {
  userId: string;
  isActive: boolean;
  currentRole: string;
  hasSubscription: boolean;
}

export default function UserActionButtons({
  userId,
  isActive,
  currentRole,
  hasSubscription,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [activeState, setActiveState] = useState(isActive);
  const [roleState, setRoleState] = useState(currentRole);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [trialDays, setTrialDays] = useState(14);

  const call = async (
    action: string,
    extra: Record<string, unknown> = {}
  ) => {
    setLoading(action);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      if (action === "toggleActive") {
        setActiveState(data.isActive);
        setFeedback({
          type: "success",
          msg: `User ${data.isActive ? "activated" : "deactivated"} successfully.`,
        });
      } else if (action === "changeRole") {
        setRoleState(data.role);
        setFeedback({
          type: "success",
          msg: `Role changed to ${data.role}.`,
        });
      } else if (action === "extendTrial") {
        const until = data.trialEndsAt
          ? new Date(data.trialEndsAt).toLocaleDateString("en-IN")
          : "unknown";
        setFeedback({
          type: "success",
          msg: `Trial extended. New end date: ${until}.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={[
            "px-4 py-3 rounded-lg text-sm",
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200",
          ].join(" ")}
        >
          {feedback.msg}
        </div>
      )}

      {/* Toggle Active */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
          <Power className="w-3.5 h-3.5" />
          Account Status
        </p>
        <button
          onClick={() => call("toggleActive")}
          disabled={loading !== null}
          className={[
            "w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
            activeState
              ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
          ].join(" ")}
        >
          {loading === "toggleActive" ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Processing...
            </span>
          ) : activeState ? (
            "Deactivate Account"
          ) : (
            "Activate Account"
          )}
        </button>
        <p className="text-xs text-gray-400 mt-1.5">
          Currently:{" "}
          <strong className={activeState ? "text-green-600" : "text-red-600"}>
            {activeState ? "Active" : "Inactive"}
          </strong>
        </p>
      </div>

      {/* Change Role */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
          <UserCog className="w-3.5 h-3.5" />
          Change Role
        </p>
        <div className="flex gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          >
            <option value="LAWYER">LAWYER</option>
            <option value="CLIENT">CLIENT</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            onClick={() => call("changeRole", { role: selectedRole })}
            disabled={loading !== null || selectedRole === roleState}
            className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#16304f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "changeRole" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Apply"
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Current role:{" "}
          <strong className="text-gray-700">{roleState}</strong>
        </p>
      </div>

      {/* Extend Trial */}
      {hasSubscription && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Extend Trial
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) =>
                  setTrialDays(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                days
              </span>
            </div>
            <button
              onClick={() => call("extendTrial", { days: trialDays })}
              disabled={loading !== null}
              className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#16304f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "extendTrial" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Extend"
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Adds days to the trial end date (or from today if already expired).
          </p>
        </div>
      )}

      {!hasSubscription && (
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
          This user has no subscription. Trial extension is not available.
        </p>
      )}
    </div>
  );
}
