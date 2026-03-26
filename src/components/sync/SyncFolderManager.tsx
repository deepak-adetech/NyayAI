"use client";
import { FolderSync, CheckCircle, FileText, Inbox, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface SyncFolder {
  id: string;
  folderPath: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  syncCount: number;
  createdAt: Date;
}

interface SyncedDoc {
  id: string;
  title: string;
  fileName: string;
  type: string;
  syncedAt: Date | null;
  case: { id: string; title: string } | null;
}

interface Props {
  folders: SyncFolder[];
  recentSynced: SyncedDoc[];
}

export default function SyncFolderManager({ folders, recentSynced }: Props) {
  const activeFolders = folders.filter((f) => f.isActive);
  const totalSynced = folders.reduce((sum, f) => sum + f.syncCount, 0);

  return (
    <div className="space-y-5">

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <FolderSync className="h-5 w-5" />
          How Auto-Sync Works
        </h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Install the NyayAI Sync agent on your computer (Step 1 above)</li>
          <li>Open the agent, sign in, and <strong>select folders to watch</strong> from your computer</li>
          <li>The agent monitors those folders for new PDFs, Word docs, and images</li>
          <li>Each file is read, classified (FIR, Order, Judgment…) and matched to the right case</li>
          <li>Documents appear in the case timeline instantly — no manual upload needed</li>
          <li>Unmatched files go to <strong>📥 Sync Inbox</strong> for manual assignment</li>
        </ol>
        <div className="mt-3 flex items-start gap-2 bg-blue-100 rounded-lg p-2.5">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Folder selection happens inside the <strong>desktop app</strong> — only it can access your local drive.
            This web dashboard shows the sync activity and documents that have already been synced.
          </p>
        </div>
      </div>

      {/* Sync stats (if any activity) */}
      {(activeFolders.length > 0 || totalSynced > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#1e3a5f]">{activeFolders.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Folders watched</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-[#1e3a5f]">{totalSynced}</p>
            <p className="text-xs text-gray-500 mt-0.5">Files synced</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">
              {recentSynced.filter((d) => d.case).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Auto-matched to cases</p>
          </div>
        </div>
      )}

      {/* Active folders (registered by the desktop agent) */}
      {activeFolders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
            Actively Watching ({activeFolders.length} {activeFolders.length === 1 ? "folder" : "folders"})
          </h2>
          <div className="space-y-2">
            {activeFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-gray-800 truncate">
                      {folder.folderPath}
                    </p>
                    <p className="text-xs text-gray-500">
                      {folder.syncCount} {folder.syncCount === 1 ? "file" : "files"} synced
                      {folder.lastSyncAt && ` · Last sync: ${formatDate(folder.lastSyncAt)}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-3">
                  Live
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            To add or remove folders, open the NyayAI Sync app on your computer.
          </p>
        </div>
      )}

      {/* No agent connected yet */}
      {activeFolders.length === 0 && recentSynced.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <FolderSync className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No sync activity yet</p>
          <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
            Download and install the desktop agent above, sign in, and select folders to watch.
            Your synced documents will appear here automatically.
          </p>
        </div>
      )}

      {/* Recent synced documents */}
      {recentSynced.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            Recent Auto-Synced Documents
          </h2>
          <div className="divide-y divide-gray-50">
            {recentSynced.map((doc) => (
              <div key={doc.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 truncate font-mono">{doc.fileName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {doc.case ? (
                    <Link
                      href={`/cases/${doc.case.id}`}
                      className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors"
                    >
                      → {doc.case.title.substring(0, 28)}
                      {doc.case.title.length > 28 ? "…" : ""}
                    </Link>
                  ) : (
                    <Link
                      href="/cases/inbox"
                      className="text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Inbox className="h-3 w-3 inline mr-0.5" />
                      Inbox
                    </Link>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.syncedAt ? formatDate(doc.syncedAt) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
