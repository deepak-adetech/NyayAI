const WHISPER_URL = process.env.WHISPER_URL ?? "http://whisper:9000";

export interface TranscriptionResult {
  text: string;
  language: string | null; // ISO code, e.g. "hi", "ta", "en"
}

/**
 * Transcribe an audio clip in any (Indian) language via the self-hosted
 * Whisper ASR webservice. Whisper auto-detects the spoken language and
 * returns the text in that language's native script.
 */
export async function transcribeAudio(
  audio: Blob,
  filename: string
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("audio_file", audio, filename);

  // encode=true → let the service ffmpeg-decode browser webm/ogg/mp4.
  // task=transcribe → keep the original language (do NOT translate to English).
  // output=json → returns { text, segments, language }.
  const url = `${WHISPER_URL}/asr?encode=true&task=transcribe&output=json`;

  const res = await fetch(url, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Whisper error ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  let text = "";
  let language: string | null = null;

  if (ct.includes("application/json")) {
    const data = (await res.json()) as { text?: string; language?: string };
    text = (data.text ?? "").trim();
    language = data.language ?? null;
  } else {
    // Some configs return plain text
    text = (await res.text()).trim();
  }

  return { text, language };
}
