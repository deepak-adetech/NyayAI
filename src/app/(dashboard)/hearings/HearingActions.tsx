"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

interface Props {
  hearingId: string;
  caseId: string;
}

export default function HearingActions({ hearingId, caseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markCompleted() {
    setLoading(true);
    try {
      await fetch(`/api/hearings/${hearingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={markCompleted}
      disabled={loading}
      className="mt-1 flex items-center gap-1 text-xs text-green-600 hover:text-green-700 disabled:opacity-50"
      title="Mark as completed"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle className="h-3.5 w-3.5" />
      )}
      Done
    </button>
  );
}
