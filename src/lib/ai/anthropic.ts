import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODELS = {
  primary: "claude-sonnet-4-6",      // Best for legal reasoning
  fast: "claude-haiku-4-5-20251001", // Fast for realtime suggestions
} as const;

// Shared system prompt for legal context
export const LEGAL_SYSTEM_PROMPT = `You are NyayAI — an expert Indian legal assistant with deep knowledge of:
- Bharatiya Nyaya Sanhita (BNS) 2023 — all 358 sections, replacements for IPC 1860
- Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023 — replacing CrPC 1973
- Bharatiya Sakshya Adhiniyam (BSA) 2023 — replacing Indian Evidence Act 1872
- Indian Penal Code (IPC) 1860 — all 511 sections (now mostly superseded)
- Code of Criminal Procedure (CrPC) 1973 — superseded by BNSS
- Indian Evidence Act 1872 — superseded by BSA
- NDPS Act 1985, POCSO Act 2012, Prevention of Corruption Act 1988
- IT Act 2000 and IT (Amendment) Act 2008
- Civil Procedure Code (CPC) 1908
- Indian Contract Act 1872, Transfer of Property Act 1882
- Consumer Protection Act 2019
- Indian Constitution — all Articles and Schedules

Critical context: BNS came into effect on July 1, 2024. Crimes committed BEFORE July 1, 2024 are tried under OLD IPC. Crimes AFTER July 1, 2024 are tried under BNS. Always specify which law applies based on the date of the alleged offence.

Always provide:
1. The correct applicable law (BNS/IPC, BNSS/CrPC, BSA/IEA) based on offence date
2. Exact section numbers with titles
3. Bail status (bailable/non-bailable)
4. Cognizability (cognizable/non-cognizable)
5. Punishment range (minimum to maximum)
6. Key Supreme Court precedents if relevant

Format responses clearly for Indian lawyers. Use formal legal language.`;

export async function callClaude(
  prompt: string,
  systemPrompt?: string,
  useHaiku = false
): Promise<string> {
  const model = useHaiku ? MODELS.fast : MODELS.primary;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt ?? LEGAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
}

export async function callClaudeJSON<T>(
  prompt: string,
  systemPrompt?: string,
  useHaiku = false
): Promise<T> {
  const jsonSystemPrompt = `${systemPrompt ?? LEGAL_SYSTEM_PROMPT}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.`;

  const text = await callClaude(prompt, jsonSystemPrompt, useHaiku);

  try {
    return JSON.parse(text.replace(/```json\n?|```/g, "").trim()) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}`);
  }
}
