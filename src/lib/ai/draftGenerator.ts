/**
 * Legal Draft Generator — NyayAI
 *
 * Generates court-ready legal drafts: Plaints, Written Statements, Petitions, Replies.
 * CPC Order VII/VIII compliant formatting.
 */

import { callClaude } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";

export type DraftType = "plaint" | "written_statement" | "petition" | "reply";

export interface DraftParams {
  draftType: DraftType;
  courtName: string;
  jurisdiction: string;
  caseType: string;
  caseNumber?: string;
  plaintiffName: string;
  plaintiffAddress: string;
  plaintiffFatherName?: string;
  defendantName: string;
  defendantAddress: string;
  defendantFatherName?: string;
  advocateName: string;
  advocateBarCouncil?: string;
  // Plaint-specific
  causeOfAction?: string;
  dateOfCauseOfAction?: string;
  reliefSought?: string;
  suitValuation?: string;
  courtFees?: string;
  supportingFacts?: string;
  // Written Statement-specific
  paraByParaResponse?: string;
  preliminaryObjections?: string;
  additionalPleas?: string;
  counterClaim?: string;
  // Petition-specific
  petitionType?: string; // "writ" | "criminal_misc" | "civil_revision" | "other"
  petitionGrounds?: string;
  petitionPrayer?: string;
  urgencyGrounds?: string;
  // Reply-specific
  replyToApplication?: string;
  replyPoints?: string;
}

const DRAFT_TYPE_INSTRUCTIONS: Record<DraftType, string> = {
  plaint: `
Generate a PLAINT as per CPC Order VII.
Structure:
1. Title of the suit (Court heading, cause title)
2. Description of parties (with full address, father's name)
3. Jurisdiction clause (territorial, pecuniary)
4. Statement of facts (numbered paragraphs)
5. Cause of action (with date and place)
6. Valuation of suit and court fees
7. Relief/Prayer clause (specific and general)
8. Verification (sworn statement by plaintiff)
9. List of documents relied upon

Key CPC provisions:
- Order VII Rule 1-7: Contents of plaint
- Order VII Rule 11: Rejection grounds
- S.26: Institution of suits
- Limitation Act compliance
`,
  written_statement: `
Generate a WRITTEN STATEMENT as per CPC Order VIII.
Structure:
1. Title (same cause title as suit)
2. Preliminary objections (jurisdiction, limitation, maintainability, misjoinder, etc.)
3. Para-by-para reply to plaint (admit/deny/no knowledge for each paragraph)
4. Additional pleas and defences
5. Counter-claim if applicable (Order VIII Rule 6A)
6. Prayer (dismissal with costs)
7. Verification

Key CPC provisions:
- Order VIII Rule 1: Written statement within 30 days (extendable to 120 days max)
- Order VIII Rule 3-5: Specific denials required; deemed admission otherwise
- Salem Advocate Bar Association v. Union of India — strict timelines
`,
  petition: `
Generate a PETITION (Writ/Criminal Misc/Civil Revision as specified).
Structure:
1. Title (Court heading, case type, cause title)
2. Index of contents
3. Synopsis and list of dates
4. Grounds (numbered)
5. Prayer
6. Verification
7. List of annexed documents

For Writ Petitions: Reference Art. 226 (HC) or Art. 32 (SC), specify type (Mandamus/Certiorari/Prohibition/Habeas Corpus/Quo Warranto)
For Criminal Misc: Reference BNSS/CrPC applicable section
`,
  reply: `
Generate a REPLY/OBJECTION to an application.
Structure:
1. Title (same cause title)
2. Brief background
3. Preliminary objections
4. Point-by-point reply to the application
5. Prayer (dismissal of application with costs)
6. Verification
`,
};

export async function generateLegalDraft(params: DraftParams): Promise<string> {
  let ragContext = "";
  try {
    ragContext = await buildRagContext(
      `${params.draftType} ${params.caseType} CPC procedure Indian court`
    );
  } catch {
    ragContext = "";
  }

  const instructions = DRAFT_TYPE_INSTRUCTIONS[params.draftType];
  const details = buildDraftDetails(params);

  const prompt = `
You are an expert Indian civil/criminal lawyer. Draft a ${params.draftType.replace(/_/g, " ").toUpperCase()}.

## Instructions:
${instructions}

## Case Details:
- Court: ${params.courtName}
- Jurisdiction: ${params.jurisdiction}
- Case Type: ${params.caseType}
${params.caseNumber ? `- Case Number: ${params.caseNumber}` : "- Case Number: [To be assigned]"}

## Plaintiff/Petitioner:
- Name: ${params.plaintiffName}
- Address: ${params.plaintiffAddress}
${params.plaintiffFatherName ? `- S/o, D/o: ${params.plaintiffFatherName}` : ""}

## Defendant/Respondent:
- Name: ${params.defendantName}
- Address: ${params.defendantAddress}
${params.defendantFatherName ? `- S/o, D/o: ${params.defendantFatherName}` : ""}

## Advocate: ${params.advocateName}${params.advocateBarCouncil ? ` (${params.advocateBarCouncil})` : ""}

${details}

${ragContext ? `## Relevant Legal Knowledge:\n${ragContext}` : ""}

Generate the complete draft in formal Indian court format. Use proper legal language. Include all standard clauses. Number all paragraphs. Do NOT use markdown formatting — output plain text as would be filed in court.
`;

  return callClaude(prompt);
}

function buildDraftDetails(params: DraftParams): string {
  const sections: string[] = [];

  if (params.causeOfAction) sections.push(`## Cause of Action:\n${params.causeOfAction}`);
  if (params.dateOfCauseOfAction) sections.push(`Date of Cause of Action: ${params.dateOfCauseOfAction}`);
  if (params.reliefSought) sections.push(`## Relief Sought:\n${params.reliefSought}`);
  if (params.suitValuation) sections.push(`Suit Valuation: Rs. ${params.suitValuation}`);
  if (params.courtFees) sections.push(`Court Fees: Rs. ${params.courtFees}`);
  if (params.supportingFacts) sections.push(`## Supporting Facts:\n${params.supportingFacts}`);
  if (params.paraByParaResponse) sections.push(`## Para-by-Para Response:\n${params.paraByParaResponse}`);
  if (params.preliminaryObjections) sections.push(`## Preliminary Objections:\n${params.preliminaryObjections}`);
  if (params.additionalPleas) sections.push(`## Additional Pleas:\n${params.additionalPleas}`);
  if (params.counterClaim) sections.push(`## Counter-Claim:\n${params.counterClaim}`);
  if (params.petitionType) sections.push(`Petition Type: ${params.petitionType}`);
  if (params.petitionGrounds) sections.push(`## Grounds:\n${params.petitionGrounds}`);
  if (params.petitionPrayer) sections.push(`## Prayer:\n${params.petitionPrayer}`);
  if (params.urgencyGrounds) sections.push(`## Urgency Grounds:\n${params.urgencyGrounds}`);
  if (params.replyToApplication) sections.push(`## Replying To:\n${params.replyToApplication}`);
  if (params.replyPoints) sections.push(`## Points of Reply:\n${params.replyPoints}`);

  return sections.join("\n\n");
}
