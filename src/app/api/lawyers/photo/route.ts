import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/storage";

// GET /api/lawyers/photo?key=lawyers/photos/... — public photo serving.
export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || !key.startsWith("lawyers/photos/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await getFile(key).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = key.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
