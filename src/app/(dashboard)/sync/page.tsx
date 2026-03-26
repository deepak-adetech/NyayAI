export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SyncFolderManager from "@/components/sync/SyncFolderManager";
import { Download, Monitor, Apple, AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function SyncPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const folders = await prisma.localSyncFolder.findMany({
    where: { lawyerId: session.user.id! },
    orderBy: { createdAt: "desc" },
  });

  const recentSynced = await prisma.document.findMany({
    where: {
      uploadedById: session.user.id!,
      syncedAt: { not: null },
    },
    include: { case: { select: { id: true, title: true } } },
    orderBy: { syncedAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📁 File Sync</h1>
        <p className="text-gray-500 text-sm mt-1">
          Install the desktop sync agent to automatically upload documents from your computer to the right cases — no manual work needed.
        </p>
      </div>

      {/* Step 1 — Download */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-5">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Download className="h-5 w-5 text-[#1e3a5f]" />
          Step 1: Download the Desktop Sync Agent
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Runs silently in the background. Watches folders you choose, reads documents, and syncs them to the correct cases automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Windows */}
          <a
            href="/api/download?platform=windows"
            className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors group"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Monitor className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Windows</p>
              <p className="text-xs text-gray-500">NyayAI-Sync-Setup.exe · ~78 MB</p>
              <p className="text-xs text-blue-600 mt-0.5 group-hover:underline">Download →</p>
            </div>
          </a>

          {/* Mac */}
          <div className="flex flex-col gap-2">
            <a
              href="/api/download?platform=mac-arm64"
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Apple className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Mac — Apple Silicon</p>
                <p className="text-xs text-gray-500">M1 / M2 / M3 · arm64 · ~91 MB</p>
                <p className="text-xs text-blue-600 mt-0.5 group-hover:underline">Download →</p>
              </div>
            </a>
            <a
              href="/api/download?platform=mac-x64"
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 hover:bg-gray-100 transition-colors group"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-700 text-xs">Mac — Intel · x64 · ~95 MB</p>
                <p className="text-xs text-blue-600 mt-0.5 group-hover:underline">Download →</p>
              </div>
            </a>
          </div>
        </div>

        {/* Mac developer warning */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Mac Users — First Launch Warning</p>
            <p className="text-xs text-amber-700">
              The app will show an <strong>&ldquo;unidentified developer&rdquo;</strong> warning on first open since it is not yet Apple-signed.
              <br />
              To open it: <strong>Right-click the app → Open → click Open</strong> in the confirmation dialog.
              You only need to do this once.
            </p>
          </div>
        </div>

        {/* After installing */}
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-800">
            <strong>After installing:</strong> Open NyayAI Sync from your system tray (Windows) or Applications (Mac),
            sign in with your NyayAI email &amp; password, then select the folders you want to watch.
            Files sync automatically from that point on.
          </p>
        </div>
      </div>

      {/* Step 2 — Activity */}
      <div className="mb-2">
        <h2 className="font-semibold text-gray-700 text-sm">
          Step 2: Sync Activity &amp; Watched Folders
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Folder watching is managed from the desktop app. This page shows what has been synced.
        </p>
      </div>
      <SyncFolderManager folders={folders} recentSynced={recentSynced} />
    </div>
  );
}
