import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribe";

// Browser MediaRecorder clips are small; cap to guard the service.
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty audio" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio too long. Keep it under ~2 minutes." }, { status: 413 });
  }

  const contentType = file.type || "audio/webm";
  const filename =
    contentType.includes("mp4") || contentType.includes("m4a")
      ? "audio.mp4"
      : contentType.includes("ogg")
      ? "audio.ogg"
      : contentType.includes("wav")
      ? "audio.wav"
      : "audio.webm";

  try {
    const { text, language } = await transcribeAudio(file, filename);

    if (!text) {
      return NextResponse.json(
        { error: "Could not hear anything. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, language });
  } catch (err) {
    console.error("[transcribe] error:", err);
    return NextResponse.json(
      { error: "Voice transcription is temporarily unavailable. Please type your question." },
      { status: 503 }
    );
  }
}
