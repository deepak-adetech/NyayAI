/**
 * Legal Notice Generator — NyayAI
 *
 * Generates Indian legal notices in proper format for 10 notice types.
 */

import { callClaude } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";

export type NoticeType =
  | "CHEQUE_BOUNCE"
  | "LANDLORD_EVICTION"
  | "TENANT_NOTICE"
  | "RECOVERY_OF_MONEY"
  | "EMPLOYMENT_TERMINATION"
  | "DEFAMATION"
  | "CONSUMER_COMPLAINT"
  | "PROPERTY_DISPUTE"
  | "INSURANCE_CLAIM"
  | "GENERAL";

export interface NoticeParams {
  noticeType: NoticeType;
  senderName: string;
  senderAddress: string;
  senderAdvocate?: string;
  senderBarCouncil?: string;
  recipientName: string;
  recipientAddress: string;
  facts: string;
  demand: string;
  timelineDays: number;
  additionalPoints?: string;
  // Type-specific fields
  chequeNumber?: string;
  chequeDate?: string;
  chequeAmount?: string;
  bankName?: string;
  dishonourDate?: string;
  dishonourReason?: string;
  propertyAddress?: string;
  rentAmount?: string;
  arrearsPeriod?: string;
  employeeName?: string;
  employeeDesignation?: string;
  terminationDate?: string;
  defamationDetails?: string;
  productDetails?: string;
  purchaseDate?: string;
  policyNumber?: string;
  claimAmount?: string;
}

const NOTICE_TYPE_PROMPTS: Record<NoticeType, string> = {
  CHEQUE_BOUNCE: `
This is a legal notice under Section 138 of the Negotiable Instruments Act, 1881.
Key requirements:
- Must be sent within 30 days of receiving the dishonour memo from the bank
- Must demand payment of the cheque amount within 15 days of receipt of notice
- Must mention cheque details (number, date, amount, bank, reason for dishonour)
- Warning that failure to pay within 15 days will result in criminal complaint under S.138 NI Act
- The offence is punishable with imprisonment up to 2 years or fine up to twice the cheque amount or both
`,
  LANDLORD_EVICTION: `
This is an eviction notice from landlord to tenant.
Reference: Transfer of Property Act 1882, applicable State Rent Control Act.
Key requirements:
- Specify grounds for eviction (non-payment, bona fide need, misuse, subletting, etc.)
- State the notice period as per Rent Control Act (usually 15 days to 1 month)
- Demand vacant possession by specific date
- Mention arrears if applicable with exact amount and period
`,
  TENANT_NOTICE: `
This is a notice from tenant to landlord.
Reference: Transfer of Property Act 1882, applicable State Rent Control Act.
Key requirements:
- State the issue (maintenance failure, illegal entry, deposit refund, harassment)
- Demand specific action within timeline
- Reference tenant rights under applicable Rent Act
`,
  RECOVERY_OF_MONEY: `
This is a legal notice for recovery of money/debt.
Reference: CPC Order 37 (summary suit), Indian Contract Act 1872, BNS 2023 S.318 (cheating).
Key requirements:
- State the exact amount due with breakup (principal, interest, damages)
- Mention the basis of liability (contract, loan agreement, services rendered)
- Demand payment within 15-30 days
- Warning of civil suit and/or criminal action
`,
  EMPLOYMENT_TERMINATION: `
This is a notice related to employment termination/wrongful dismissal.
Reference: Industrial Disputes Act 1947, state Shops and Establishments Act.
Key requirements:
- State the employment details (designation, period, salary)
- Mention the grievance (wrongful termination, unpaid wages, harassment)
- Demand reinstatement/compensation/dues
- Reference applicable labour law provisions
`,
  DEFAMATION: `
This is a defamation notice.
Reference: BNS 2023 S.356 (defamation), or IPC S.499/500 for pre-July 2024 acts.
Key requirements:
- Describe the defamatory statement/publication with specifics
- State where and when it was published/spoken
- Demand retraction, apology, and/or damages
- Warning of criminal complaint under BNS S.356 and civil suit for damages
`,
  CONSUMER_COMPLAINT: `
This is a consumer complaint notice.
Reference: Consumer Protection Act 2019.
Key requirements:
- Product/service details with date and amount
- Nature of defect/deficiency
- Demand for replacement/refund/compensation
- Warning of complaint before Consumer Commission (District/State/National based on amount)
- For amounts up to 1 crore: District Commission; 1-10 crore: State Commission; above 10 crore: National Commission
`,
  PROPERTY_DISPUTE: `
This is a property dispute notice.
Reference: Transfer of Property Act 1882, Specific Relief Act 1963, Registration Act 1908.
Key requirements:
- Property identification (survey no, address, registration details)
- Nature of dispute (encroachment, title dispute, breach of agreement)
- Supporting documents referenced
- Demand for specific relief (vacate, execute, partition, etc.)
`,
  INSURANCE_CLAIM: `
This is an insurance claim notice.
Reference: Insurance Act 1938, IRDA regulations, Motor Vehicles Act 1988 (if motor).
Key requirements:
- Policy details (number, type, period)
- Claim details (incident date, nature, amount)
- Previous correspondence with insurer
- Demand for settlement within timeline
- Warning of complaint to IRDA / Insurance Ombudsman / Consumer Forum
`,
  GENERAL: `
This is a general legal notice.
Follow standard Indian legal notice format.
Key requirements:
- Clear statement of facts
- Legal basis for the demand
- Specific demand with timeline
- Consequences of non-compliance
`,
};

export async function generateLegalNotice(params: NoticeParams): Promise<string> {
  let ragContext = "";
  try {
    ragContext = await buildRagContext(`legal notice ${params.noticeType.toLowerCase().replace(/_/g, " ")}`);
  } catch {
    ragContext = "";
  }

  const typePrompt = NOTICE_TYPE_PROMPTS[params.noticeType];

  const typeSpecificDetails = buildTypeSpecificDetails(params);

  const prompt = `
You are an expert Indian lawyer drafting a legal notice. Generate a formal, professional legal notice in the standard Indian format.

## Notice Type Instructions:
${typePrompt}

## Sender Details:
- Name: ${params.senderName}
- Address: ${params.senderAddress}
${params.senderAdvocate ? `- Through Advocate: ${params.senderAdvocate}` : ""}
${params.senderBarCouncil ? `- Bar Council No.: ${params.senderBarCouncil}` : ""}

## Recipient Details:
- Name: ${params.recipientName}
- Address: ${params.recipientAddress}

## Facts:
${params.facts}

${typeSpecificDetails ? `## Type-Specific Details:\n${typeSpecificDetails}` : ""}

## Demand:
${params.demand}

## Timeline: ${params.timelineDays} days to comply

${params.additionalPoints ? `## Additional Points:\n${params.additionalPoints}` : ""}

${ragContext ? `## Relevant Legal Knowledge:\n${ragContext}` : ""}

## Format Requirements:
1. Start with: "LEGAL NOTICE" as heading
2. Include: Date, Ref number, RPAD/Speed Post notice
3. Address: "To," followed by recipient details
4. Body: "Under instructions from and on behalf of my client [name]..."
5. State facts in numbered paragraphs
6. Cite applicable laws and sections
7. Make specific demand with timeline
8. Warning clause: "In the event of non-compliance within [X] days..."
9. End with: "This notice is being sent without prejudice to my client's rights and remedies..."
10. Signature block for advocate/sender
11. CC line if applicable

Generate a complete, ready-to-use legal notice. Use formal legal English. Do NOT include any markdown formatting or headers outside the notice itself.
`;

  return callClaude(prompt);
}

function buildTypeSpecificDetails(params: NoticeParams): string {
  const lines: string[] = [];

  if (params.chequeNumber) lines.push(`- Cheque Number: ${params.chequeNumber}`);
  if (params.chequeDate) lines.push(`- Cheque Date: ${params.chequeDate}`);
  if (params.chequeAmount) lines.push(`- Cheque Amount: Rs. ${params.chequeAmount}`);
  if (params.bankName) lines.push(`- Bank: ${params.bankName}`);
  if (params.dishonourDate) lines.push(`- Date of Dishonour: ${params.dishonourDate}`);
  if (params.dishonourReason) lines.push(`- Reason for Dishonour: ${params.dishonourReason}`);
  if (params.propertyAddress) lines.push(`- Property Address: ${params.propertyAddress}`);
  if (params.rentAmount) lines.push(`- Monthly Rent: Rs. ${params.rentAmount}`);
  if (params.arrearsPeriod) lines.push(`- Arrears Period: ${params.arrearsPeriod}`);
  if (params.employeeName) lines.push(`- Employee: ${params.employeeName}`);
  if (params.employeeDesignation) lines.push(`- Designation: ${params.employeeDesignation}`);
  if (params.terminationDate) lines.push(`- Termination Date: ${params.terminationDate}`);
  if (params.defamationDetails) lines.push(`- Defamation Details: ${params.defamationDetails}`);
  if (params.productDetails) lines.push(`- Product/Service: ${params.productDetails}`);
  if (params.purchaseDate) lines.push(`- Date of Purchase: ${params.purchaseDate}`);
  if (params.policyNumber) lines.push(`- Policy Number: ${params.policyNumber}`);
  if (params.claimAmount) lines.push(`- Claim Amount: Rs. ${params.claimAmount}`);

  return lines.join("\n");
}
