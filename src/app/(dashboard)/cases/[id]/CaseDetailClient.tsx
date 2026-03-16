"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Loader2 } from "lucide-react";

interface Props {
  caseId: string;
}

export default function CaseDetailClient({ caseId }: Props) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

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

  return (
    <div className="flex gap-2">
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
  );
}
