import { callClaude, LEGAL_SYSTEM_PROMPT } from "./anthropic";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434";
const LEGAL_LLM_MODEL = process.env.LEGAL_LLM_MODEL ?? "hf.co/Ambuj-Tripathi/Indian-Legal-Llama-GGUF";

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
6. Respond in the same language the user writes in (Hindi or English).`;

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  message: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

async function callOllama(question: string): Promise<{ answer: string; tokens: number; model: string }> {
  const messages: OllamaChatMessage[] = [
    { role: "system", content: PUBLIC_LEGAL_SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LEGAL_LLM_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.3, num_predict: 2048 },
    }),
    signal: AbortSignal.timeout(120_000),
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

export async function answerLegalQuestion(question: string): Promise<{
  answer: string;
  modelUsed: string;
  tokensUsed: number;
}> {
  // Try the Indian Legal LLaMA model first
  try {
    const result = await callOllama(question);
    return {
      answer: result.answer,
      modelUsed: result.model,
      tokensUsed: result.tokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[legal-llm] Ollama unavailable, falling back to Claude:", msg);
  }

  // Fallback to Claude
  const answer = await callClaude(question, PUBLIC_LEGAL_SYSTEM_PROMPT, false);
  return {
    answer,
    modelUsed: "claude-sonnet-4-6",
    tokensUsed: 0,
  };
}
