/**
 * Bail Application Drafter — NyayAI
 *
 * Generates bail applications (regular & anticipatory) in proper Indian court format.
 * BNS/BNSS-aware: uses BNSS 2023 for post-July 2024 offences, CrPC for pre-July 2024.
 */

import { callClaude } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";

export type BailType = "REGULAR" | "ANTICIPATORY";

export interface BailParams {
  bailType: BailType;
  courtName: string;
  courtType: "SESSIONS" | "HIGH_COURT" | "MAGISTRATE";
  caseNumber?: string;
  firNumber: string;
  policeStation: string;
  district: string;
  state: string;
  offenceDate: string;
  sectionsCharged: string[];
  accusedName: string;
  accusedFatherName: string;
  accusedAge: string;
  accusedOccupation?: string;
  accusedAddress: string;
  arrestDate?: string;
  custodyDuration?: string;
  coAccusedBailStatus?: string;
  groundsForBail: string[];
  additionalFacts?: string;
  advocateName: string;
  advocateBarCouncil?: string;
}

export async function generateBailApplication(params: BailParams): Promise<string> {
  const offenceDate = new Date(params.offenceDate);
  const cutoffDate = new Date("2024-07-01");
  const isNewLaw = offenceDate >= cutoffDate;

  const applicableLaw = isNewLaw ? "BNS 2023 / BNSS 2023" : "IPC 1860 / CrPC 1973";
  const bailSection = params.bailType === "REGULAR"
    ? isNewLaw ? "Section 483 BNSS 2023" : "Section 437/439 CrPC 1973"
    : isNewLaw ? "Section 484 BNSS 2023" : "Section 438 CrPC 1973";

  let ragContext = "";
  try {
    ragContext = await buildRagContext(
      `bail application ${params.bailType.toLowerCase()} ${params.sectionsCharged.join(" ")} ${isNewLaw ? "BNSS" : "CrPC"}`
    );
  } catch {
    ragContext = "";
  }

  const prompt = `
You are an expert Indian criminal law advocate. Draft a ${params.bailType === "REGULAR" ? "Regular" : "Anticipatory"} Bail Application.

## APPLICABLE LAW: ${applicableLaw}
## BAIL PROVISION: ${bailSection}

## Case Details:
- FIR Number: ${params.firNumber}
- Police Station: ${params.policeStation}, ${params.district}, ${params.state}
- Offence Date: ${params.offenceDate}
- Sections Charged: ${params.sectionsCharged.join(", ")}
${params.caseNumber ? `- Case Number: ${params.caseNumber}` : ""}

## Accused Details:
- Name: ${params.accusedName}
- Son/Daughter of: ${params.accusedFatherName}
- Age: ${params.accusedAge}
- Occupation: ${params.accusedOccupation ?? "Not specified"}
- Address: ${params.accusedAddress}
${params.arrestDate ? `- Date of Arrest: ${params.arrestDate}` : ""}
${params.custodyDuration ? `- In Custody Since: ${params.custodyDuration}` : ""}
${params.coAccusedBailStatus ? `- Co-accused Bail Status: ${params.coAccusedBailStatus}` : ""}

## Grounds for Bail:
${params.groundsForBail.map((g, i) => `${i + 1}. ${g}`).join("\n")}

${params.additionalFacts ? `## Additional Facts:\n${params.additionalFacts}` : ""}

## Court: ${params.courtName} (${params.courtType})
## Advocate: ${params.advocateName}${params.advocateBarCouncil ? ` (${params.advocateBarCouncil})` : ""}

${ragContext ? `## Relevant Legal Knowledge & Precedents:\n${ragContext}` : ""}

## KEY SC PRECEDENTS TO CITE:
1. Arnesh Kumar v. State of Bihar (2014) 8 SCC 273 — Guidelines for arrest under S.498A; bail should be norm, not exception
2. Satender Kumar Antil v. CBI (2022) 10 SCC 51 — Bail reform; default bail; classification of offences for bail
3. Sanjay Chandra v. CBI (2012) 1 SCC 40 — Bail is rule, jail is exception
4. P. Chidambaram v. Directorate of Enforcement (2019) — Conditions for anticipatory bail
5. Maneka Gandhi v. Union of India (1978) — Article 21 right to life and personal liberty
${isNewLaw ? "6. Note the BNSS 2023 changes: S.483 (bail for non-bailable), S.484 (anticipatory bail), S.187 (default bail at 60/90 days)" : ""}

## FORMAT (exactly as filed in Indian courts):

IN THE COURT OF [COURT NAME]

[BAIL TYPE] BAIL APPLICATION
Under ${bailSection}

In the matter of:
FIR No. [number]
P.S. [police station]
Sections: [sections]

[Accused Name] ... Applicant/Accused
Versus
State of [State] ... Respondent

APPLICATION FOR ${params.bailType === "REGULAR" ? "BAIL" : "ANTICIPATORY BAIL"}

Most Respectfully Showeth:

1. That the present application is being filed under ${bailSection}...
[numbered paragraphs covering facts, grounds, precedents]

PRAYER:
[Specific prayer]

UNDERTAKING:
[Standard bail undertaking]

VERIFICATION:
[Standard verification]

[Place, Date, Advocate signature]

Generate the complete bail application. Use formal legal language. Cite specific section numbers and case laws. Do NOT include markdown formatting.
`;

  return callClaude(prompt);
}
