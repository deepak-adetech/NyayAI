import { anthropic, MODELS } from "./anthropic";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
]);

const VISION_SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const OCR_TIMEOUT_MS = 60_000;

const OCR_PROMPT = `You are an OCR engine. Extract ALL text from this document image exactly as written.

Rules:
- Preserve the original structure: headings, paragraphs, numbered lists, bullet points, tables
- Preserve legal formatting: section numbers, sub-sections, margin notes, headers/footers
- For tables, use markdown table format
- If text is in multiple columns, extract left column first then right column
- If text is in Hindi, Marathi, or other Indian languages, extract in the original script
- Do NOT add any commentary, explanation, or interpretation
- Do NOT prefix with "Here is the extracted text" or similar
- Output ONLY the extracted text

After the extracted text, on a new line output exactly:
---OCR_META---
language: <detected primary language, e.g. "en", "hi", "mr", "ta", "mixed">
confidence: <your confidence that the extraction is accurate, 0.0 to 1.0>`;

export interface VisionOCRResult {
  text: string;
  confidence: number;
  language: string;
}

export async function extractTextWithVision(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<VisionOCRResult> {
  try {
    const base64 = buffer.toString("base64");

    // Determine media type for the API
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

    if (mimeType === "application/pdf") {
      mediaType = "application/pdf";
    } else if (VISION_SUPPORTED_TYPES.has(mimeType)) {
      mediaType = mimeType as typeof mediaType;
    } else if (mimeType === "image/tiff") {
      // TIFF not directly supported by Claude vision; skip gracefully
      console.warn(`[VisionOCR] TIFF not directly supported, attempting as PNG for ${fileName}`);
      mediaType = "image/png";
    } else {
      console.warn(`[VisionOCR] Unsupported mime type: ${mimeType} for ${fileName}`);
      return { text: "", confidence: 0, language: "unknown" };
    }

    const contentBlock: any = mimeType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf",
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: base64,
          },
        };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
      const response = await anthropic.messages.create(
        {
          model: MODELS.fast,
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: [
                contentBlock,
                { type: "text", text: OCR_PROMPT },
              ],
            },
          ],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const content = response.content[0];
      if (content.type !== "text") {
        console.warn(`[VisionOCR] Unexpected response type for ${fileName}`);
        return { text: "", confidence: 0, language: "unknown" };
      }

      return parseOCRResponse(content.text);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error(`[VisionOCR] Timeout after ${OCR_TIMEOUT_MS}ms for ${fileName}`);
    } else {
      console.error(`[VisionOCR] Error processing ${fileName}:`, error);
    }
    return { text: "", confidence: 0, language: "unknown" };
  }
}

function parseOCRResponse(raw: string): VisionOCRResult {
  const metaSeparator = "---OCR_META---";
  const metaIndex = raw.lastIndexOf(metaSeparator);

  let text: string;
  let confidence = 0.7;
  let language = "en";

  if (metaIndex !== -1) {
    text = raw.substring(0, metaIndex).trim();
    const metaBlock = raw.substring(metaIndex + metaSeparator.length).trim();

    const langMatch = metaBlock.match(/language:\s*"?([^"\n]+)"?/);
    if (langMatch) language = langMatch[1].trim();

    const confMatch = metaBlock.match(/confidence:\s*([\d.]+)/);
    if (confMatch) confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])));
  } else {
    // No meta block — return full text with defaults
    text = raw.trim();
  }

  return { text, confidence, language };
}
