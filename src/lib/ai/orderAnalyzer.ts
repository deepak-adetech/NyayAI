/**
 * AI Order Analyzer — NyayAI
 *
 * Analyzes court orders to extract:
 * - Order classification (final/interim/adjournment)
 * - Next hearing date
 * - Compliance requirements with deadlines
 * - Limitation period triggers
 */

import { callClaudeJSON } from "@/lib/ai/anthropic";

export interface ComplianceRequirement {
  description: string;
  deadline: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface LimitationTrigger {
  description: string;
  limitationPeriodDays: number;
  deadlineDate: string;
  applicableProvision: string;
}

export interface OrderAnalysis {
  orderClassification: "FINAL_ORDER" | "INTERIM_ORDER" | "ADJOURNMENT_ORDER";
  nextHearingDate: string | null;
  complianceRequirements: ComplianceRequirement[];
  limitationTriggers: LimitationTrigger[];
  orderSummary: string;
  keyFindings: string[];
  courtDirections: string[];
}

export async function analyzeOrder(
  text: string,
  fileName: string
): Promise<OrderAnalysis> {
  const prompt = `
You are an expert Indian legal analyst. Analyze the following court order and extract structured information.

## Document: ${fileName}
## Order Text:
${text.slice(0, 8000)}

Extract and return ONLY this JSON:
{
  "orderClassification": "FINAL_ORDER" | "INTERIM_ORDER" | "ADJOURNMENT_ORDER",
  "nextHearingDate": "YYYY-MM-DD or null if not mentioned",
  "complianceRequirements": [
    {
      "description": "What must be done (e.g., 'File written statement', 'Deposit amount')",
      "deadline": "YYYY-MM-DD or 'within X days' if no specific date",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "limitationTriggers": [
    {
      "description": "What right has been triggered (e.g., 'Right to appeal against conviction')",
      "limitationPeriodDays": number,
      "deadlineDate": "YYYY-MM-DD (computed from order date + limitation period)",
      "applicableProvision": "e.g., Art.114 Limitation Act / S.374 CrPC / S.395 BNSS"
    }
  ],
  "orderSummary": "2-3 sentence summary of what the order says",
  "keyFindings": ["Key findings or holdings of the court — array of strings"],
  "courtDirections": ["Specific directions given by court — array of strings"]
}

Rules:
- FINAL_ORDER: Judgment, decree, conviction, acquittal, dismissal, disposal
- INTERIM_ORDER: Stay, injunction, bail, temporary arrangement, partial relief
- ADJOURNMENT_ORDER: Case adjourned, posted for next date, sine die
- Look for dates in dd/mm/yyyy, dd-mm-yyyy, or written format
- For limitation triggers: only flag if it's a final order or an appealable interim order
- For compliance: identify all court-imposed deadlines and conditions
- If information is unclear, use null/empty array rather than guessing
`;

  const result = await callClaudeJSON<OrderAnalysis>(prompt);

  // Ensure all arrays exist
  if (!result.complianceRequirements) result.complianceRequirements = [];
  if (!result.limitationTriggers) result.limitationTriggers = [];
  if (!result.keyFindings) result.keyFindings = [];
  if (!result.courtDirections) result.courtDirections = [];

  return result;
}
