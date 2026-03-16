import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const addFolderSchema = z.object({
  folderPath: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.localSyncFolder.findMany({
    where: { lawyerId: session.user.id! },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { folderPath } = addFolderSchema.parse(body);

    // Security: resolve path and ensure it's not a system directory
    const resolvedPath = path.resolve(folderPath);
    const systemDirs = ["/etc", "/usr", "/bin", "/sbin", "/var", "/tmp", "/root"];
    if (systemDirs.some((d) => resolvedPath.startsWith(d))) {
      return NextResponse.json({ error: "Cannot watch system directories" }, { status: 400 });
    }

    // Verify folder exists
    try {
      const stat = await fs.stat(resolvedPath);
      if (!stat.isDirectory()) {
        return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Folder not found or not accessible" }, { status: 400 });
    }

    // Add to DB
    const folder = await prisma.localSyncFolder.upsert({
      where: {
        lawyerId_folderPath: {
          lawyerId: session.user.id!,
          folderPath: resolvedPath,
        },
      },
      update: { isActive: true },
      create: {
        lawyerId: session.user.id!,
        folderPath: resolvedPath,
        isActive: true,
      },
    });

    // Start watching (trigger via API)
    try {
      const { startWatchingFolder } = await import("@/sync/fileWatcher");
      await startWatchingFolder(session.user.id!, resolvedPath);
    } catch (e) {
      console.warn("Could not start watcher:", e);
    }

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add folder" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("id");

  if (!folderId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const folder = await prisma.localSyncFolder.findFirst({
    where: { id: folderId, lawyerId: session.user.id! },
  });

  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { stopWatchingFolder } = await import("@/sync/fileWatcher");
    await stopWatchingFolder(session.user.id!, folder.folderPath);
  } catch (e) {
    console.warn("Could not stop watcher:", e);
  }

  await prisma.localSyncFolder.update({
    where: { id: folderId },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Folder removed from sync" });
}
