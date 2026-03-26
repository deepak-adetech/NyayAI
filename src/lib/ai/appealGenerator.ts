/**
 * Grounds of Appeal Generator — NyayAI
 *
 * Analyzes a trial court order/judgment and generates structured
 * grounds of appeal with supporting precedents.
 */

import { callClaudeJSON, callClaude } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";

export interface AppealGround {
  groundNumber: number;
  heading: string;
  detail: string;
  supportingPrecedent?: string;
}

export interface AppealAnalysis {
  orderSummary: string;
  keyFindings: string[];
  legalErrors: string[];
  factualErrors: string[];
  proceduralIrregularities: string[];
  groundsOfAppeal: AppealGround[];
}

export interface AppealResult {
  analysis: AppealAnalysis;
  formattedAppealMemo: string;
}

export async function generateGroundsOfAppeal(
  orderText: string,
  details: {
    caseType: string;
    appellantName: string;
    respondentName: string;
    courtOfAppeal: string;
    trialCourt?: string;
    caseNumber?: string;
    advocateName?: string;
  }
): Promise<AppealResult> {
  let ragContext = "";
  try {
    ragContext = await buildRagContext(`appeal grounds ${details.caseType} error of law`);
  } catch {
    ragContext = "";
  }

  // Step 1: Structured analysis
  const analysisPrompt = `
You are an expert Indian appellate lawyer. Analyze the following trial court order/judgment and identify all possible grounds of appeal.

## Order/Judgment Text:
${orderText.slice(0, 8000)}

## Case Type: ${details.caseType}
## Trial Court: ${details.trialCourt ?? "Not specified"}

${ragContext ? `## Relevant Legal Knowledge:\n${ragContext}` : ""}

Identify:
1. Legal errors (misapplication of law, wrong interpretation, ignoring binding precedent)
2. Factual errors (perverse findings, ignoring evidence, misreading testimony)
3. Procedural irregularities (violation of principles of natural justice, non-compliance with procedural law)

Return ONLY this JSON:
{
  "orderSummary": "2-3 sentence summary of the order",
  "keyFindings": ["Finding 1", "Finding 2"],
  "legalErrors": ["Error 1 with specific legal provision violated"],
  "factualErrors": ["Factual error 1 with reference to specific evidence"],
  "proceduralIrregularities": ["Irregularity 1 with reference to procedure violated"],
  "groundsOfAppeal": [
    {
      "groundNumber": 1,
      "heading": "Short heading (e.g., 'Misapplication of Section 302 IPC')",
      "detail": "Detailed ground explaining the error and why it warrants reversal",
      "supportingPrecedent": "Case citation (e.g., 'Bachan Singh v. State of Punjab (1980) 2 SCC 684')"
    }
  ]
}

Include 5-15 grounds of appeal ordered by strength (strongest first).
`;

  const analysis = await callClaudeJSON<AppealAnalysis>(analysisPrompt);
  if (!analysis.groundsOfAppeal) analysis.groundsOfAppeal = [];
  if (!analysis.keyFindings) analysis.keyFindings = [];
  if (!analysis.legalErrors) analysis.legalErrors = [];
  if (!analysis.factualErrors) analysis.factualErrors = [];
  if (!analysis.proceduralIrregularities) analysis.proceduralIrregularities = [];

  // Step 2: Formatted appeal memo
  const memoPrompt = `
You are an expert Indian appellate lawyer. Using the analysis below, draft a formal MEMORANDUM OF APPEAL / GROUNDS OF APPEAL.

## Analysis:
${JSON.stringify(analysis, null, 2)}

## Appeal Details:
- Appellant: ${details.appellantName}
- Respondent: ${details.respondentName}
- Court of Appeal: ${details.courtOfAppeal}
${details.caseNumber ? `- Case Number: ${details.caseNumber}` : ""}
${details.trialCourt ? `- Trial Court: ${details.trialCourt}` : ""}
${details.advocateName ? `- Advocate for Appellant: ${details.advocateName}` : ""}

## FORMAT:

IN THE ${details.courtOfAppeal.toUpperCase()}

[APPEAL TYPE] No. _____ of 20__

${details.appellantName} ... Appellant
Versus
${details.respondentName} ... Respondent

MEMORANDUM OF APPEAL
(Under [applicable section])

The appellant above named respectfully submits as follows:

GROUNDS OF APPEAL:
[Numbered grounds with full detail and case citations]

PRAYER:
[Specific prayer for reversal/modification]

VERIFICATION:
[Standard verification]

[Place, Date, Advocate signature]

Generate the complete, court-ready appeal memorandum. Use formal legal language. Do NOT use markdown formatting.
`;

  const formattedAppealMemo = await callClaude(memoPrompt);

  return { analysis, formattedAppealMemo };
}
