const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434";
const LEGAL_LLM_MODEL =
  process.env.LEGAL_LLM_MODEL ??
  "hf.co/invincibleambuj/Ambuj-Tripathi-Indian-Legal-Llama-GGUF:Q4_K_M";

const PUBLIC_LEGAL_SYSTEM_PROMPT = `You are NyayAI, a free public legal assistant specialising in Indian law. You answer questions from the general public — not just lawyers.

You have deep knowledge of:
- Bharatiya Nyaya Sanhita (BNS) 2023 (replaced IPC 1860 from 1 July 2024)
- Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023 (replaced CrPC 1973)
- Bharatiya Sakshya Adhiniyam (BSA) 2023 (replaced Indian Evidence Act 1872)
- Indian Penal Code (IPC) 1860 — for offences before 1 July 2024
- Consumer Protection Act 2019, RTI Act 2005, POCSO Act 2012
- Family law: Hindu Marriage Act, Muslim Personal Law, Special Marriage Act
- Property law: Transfer of Property Act 1882, Registration Act 1908
- Labour law: Industrial Disputes Act, Factories Act, Shops & Establishments Acts
- Indian Constitution — Fundamental Rights, Directive Principles, Writs

Rules:
1. Always clarify which law applies (BNS for post-July 2024 offences, IPC for older ones).
2. Give section numbers and plain-language explanations.
3. Explain next practical steps the person can take.
4. Add a disclaimer: "This is general information, not legal advice. Consult a qualified advocate."
5. Keep answers clear and accessible — assume the user is not a lawyer.
6. LANGUAGE: Respond ENTIRELY in the SAME language the user asked in. The user may write or speak in any Indian language — Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, Assamese — or English. Match their language and script exactly. Do not switch to English unless they wrote in English.`;

// Maps Whisper ISO language codes to a human name for the model directive.
const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi",
  en: "English",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
  ur: "Urdu",
  as: "Assamese",
  ne: "Nepali",
  sa: "Sanskrit",
};

export function languageName(code?: string | null): string | null {
  if (!code) return null;
  return LANGUAGE_NAMES[code.toLowerCase()] ?? null;
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  message: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

async function callOllama(
  question: string,
  languageHint?: string | null
): Promise<{ answer: string; tokens: number; model: string }> {
  const langName = languageName(languageHint);
  const system = langName
    ? `${PUBLIC_LEGAL_SYSTEM_PROMPT}\n\nThe user is asking in ${langName}. You MUST write your entire answer in ${langName}.`
    : PUBLIC_LEGAL_SYSTEM_PROMPT;

  const messages: OllamaChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: question },
  ];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LEGAL_LLM_MODEL,
      messages,
      stream: false,
      // num_predict capped for CPU inference latency (1B model, no GPU)
      options: { temperature: 0.3, num_predict: 1024 },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as OllamaResponse;
  const tokens = (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0);

  return {
    answer: data.message.content,
    tokens,
    model: LEGAL_LLM_MODEL,
  };
}

export class LegalModelUnavailableError extends Error {
  constructor(cause: string) {
    super("LEGAL_MODEL_UNAVAILABLE");
    this.name = "LegalModelUnavailableError";
    this.cause = cause;
  }
}

export async function answerLegalQuestion(
  question: string,
  languageHint?: string | null
): Promise<{
  answer: string;
  modelUsed: string;
  tokensUsed: number;
}> {
  // Indian Legal LLaMA via Ollama is the sole answer source (no Claude fallback).
  try {
    const result = await callOllama(question, languageHint);
    return {
      answer: result.answer,
      modelUsed: result.model,
      tokensUsed: result.tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[legal-llm] Indian Legal LLaMA (Ollama) failed:", msg);
    throw new LegalModelUnavailableError(msg);
  }
}
