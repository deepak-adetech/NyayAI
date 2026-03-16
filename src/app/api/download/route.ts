import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_FILES: Record<string, { fileName: string; contentType: string }> = {
  windows: {
    fileName: "NyayaSahayak-Sync-Setup.exe",
    contentType: "application/octet-stream",
  },
  mac: {
    // Auto-detect based on user agent
    fileName: "NyayaSahayak-Sync-arm64.dmg",
    contentType: "application/x-apple-diskimage",
  },
  "mac-arm64": {
    fileName: "NyayaSahayak-Sync-arm64.dmg",
    contentType: "application/x-apple-diskimage",
  },
  "mac-x64": {
    fileName: "NyayaSahayak-Sync-x64.dmg",
    contentType: "application/x-apple-diskimage",
  },
};

// Storage path for download files - stored in /app/storage/downloads in production
// or /app/public/downloads as fallback
function getFilePath(fileName: string): string {
  // Try storage volume first (persists across container restarts)
  const storagePath = path.join("/app/storage/downloads", fileName);
  if (fs.existsSync(storagePath)) return storagePath;

  // Fallback to public/ dir (exists in container's public dir)
  const publicPath = path.join(process.cwd(), "public", "downloads", fileName);
  if (fs.existsSync(publicPath)) return publicPath;

  return "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") ?? "windows";
  const ua = req.headers.get("user-agent") ?? "";

  // Auto-detect mac architecture from user agent if platform=mac
  let resolvedPlatform = platform;
  if (platform === "mac") {
    // M1/M2/M3 Macs report arm64 in modern UAs, x86 Macs don't
    resolvedPlatform = "mac-arm64"; // Default to arm64 (most modern Macs)
    if (ua.includes("Intel Mac OS X") || ua.includes("x86_64")) {
      resolvedPlatform = "mac-x64";
    }
  }

  const fileInfo = ALLOWED_FILES[resolvedPlatform];
  if (!fileInfo) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const filePath = getFilePath(fileInfo.fileName);
  if (!filePath) {
    return NextResponse.json(
      {
        error: "Installer not found",
        message: "Please contact support@nyayasahayak.com for the download link.",
      },
      { status: 404 }
    );
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  // Handle range requests for resumable downloads
  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    const readable = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(readable, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": fileInfo.contentType,
        "Content-Disposition": `attachment; filename="${fileInfo.fileName}"`,
      },
    });
  }

  // Full file download
  const stream = fs.createReadStream(filePath);
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Type": fileInfo.contentType,
      "Content-Disposition": `attachment; filename="${fileInfo.fileName}"`,
      "Content-Length": fileSize.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    },
  });
}
