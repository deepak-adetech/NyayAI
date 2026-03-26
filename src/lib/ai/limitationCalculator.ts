/**
 * Limitation Period Calculator — NyayAI
 *
 * Analyzes court order text and determines applicable limitation period
 * under the Limitation Act 1963, with exact deadline computation.
 */

import { callClaudeJSON } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";

export interface LimitationResult {
  orderType: "final" | "interim" | "adjournment" | "unknown";
  applicableArticle: string;
  articleTitle: string;
  limitationPeriodDays: number;
  computationBreakdown: string;
  filingDeadline: string;
  startDate: string;
  specialConditions: string[];
  condonationPossible: boolean;
  condonationNotes?: string;
  disclaimer: string;
}

export async function calculateLimitationPeriod(
  orderText: string,
  caseType: string,
  orderDate?: string
): Promise<LimitationResult> {
  let ragContext = "";
  try {
    ragContext = await buildRagContext(`limitation period ${caseType} appeal revision`);
  } catch {
    ragContext = "";
  }

  const prompt = `
You are an expert Indian legal advisor specializing in the Limitation Act 1963.

Analyze the following court order and determine the applicable limitation period.

## Court Order Text:
${orderText.slice(0, 6000)}

## Case Type: ${caseType}
${orderDate ? `## Order Date: ${orderDate}` : "## Order Date: Not specified — use today's date for computation"}

${ragContext ? `## Relevant Legal Knowledge:\n${ragContext}` : ""}

## Key Articles of the Limitation Act 1963:
- Art. 114: Appeal from decree (90 days from date of decree)
- Art. 115: Appeal from order under CPC (30 days)
- Art. 116: Appeal to Supreme Court (60/90 days)
- Art. 117: Application for review (30 days)
- Art. 131: Suit for possession of immovable property (12 years)
- Art. 137: Any other application (3 years)
- S. 5: Condonation of delay (for appeals and applications, not suits)
- S. 12: Exclusion of time for obtaining certified copy of order
- S. 14: Exclusion of time for bona fide prosecution in wrong court

## For Criminal Matters:
- CrPC S.372/BNSS: Victim's right to appeal (90 days)
- S.374 CrPC / BNSS S.395: Appeal against conviction (30/90 days depending on court)
- S.378 CrPC / BNSS S.399: Appeal against acquittal (by state/complainant)
- Criminal revision: 90 days from order

Respond with ONLY this JSON:
{
  "orderType": "final" | "interim" | "adjournment" | "unknown",
  "applicableArticle": "Article number and Act (e.g., 'Article 114, Limitation Act 1963')",
  "articleTitle": "Title of the article",
  "limitationPeriodDays": number (in days),
  "computationBreakdown": "Step-by-step computation explaining: start date, period, any exclusions under S.12/S.14, final deadline",
  "filingDeadline": "YYYY-MM-DD format (computed exact date)",
  "startDate": "YYYY-MM-DD (date from which limitation starts)",
  "specialConditions": ["List of special conditions, exclusions, or caveats"],
  "condonationPossible": true/false (whether S.5 applies),
  "condonationNotes": "If condonation possible, explain grounds typically accepted",
  "disclaimer": "Standard legal disclaimer"
}
`;

  const result = await callClaudeJSON<LimitationResult>(prompt);

  if (!result.disclaimer) {
    result.disclaimer = "This is an AI-generated estimate. Consult the Limitation Act 1963 and relevant case law. Time exclusions under S.12 (obtaining certified copy) and S.14 (bona fide proceedings in wrong court) may apply. Always verify with a qualified legal professional.";
  }

  return result;
}
