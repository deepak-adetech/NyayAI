/**
 * BNS/IPC Section Identification Engine
 * Identifies applicable legal sections from case facts
 */
import { callClaudeJSON } from "./anthropic";
import { prisma } from "@/lib/prisma";

interface SectionResult {
  law: string;
  sectionNumber: string;
  title: string;
  punishment: string | null;
  isBailable: boolean | null;
  isCognizable: boolean | null;
  isNonBailable: boolean | null;
  applicabilityReason: string;
  mappedFrom?: {
    law: string;
    section: string;
  };
}

interface SectionIdentificationResult {
  offenceDate: string | null;
  applicableLaw: "BNS" | "IPC" | "BOTH";
  primarySections: SectionResult[];
  additionalSections: SectionResult[];
  bailAssessment: string;
  custodyStatus: "bailable" | "non-bailable" | "mixed";
  recommendedActions: string[];
  disclaimer: string;
}

export async function identifySections(
  caseFacts: string,
  offenceDate?: string
): Promise<SectionIdentificationResult> {
  const dateContext = offenceDate
    ? `The alleged offence occurred on ${offenceDate}.`
    : "The offence date is not specified — consider both BNS and IPC.";

  const prompt = `${dateContext}

BNS Transition Rule: Offences BEFORE July 1, 2024 → IPC applies. Offences ON/AFTER July 1, 2024 → BNS applies.

Case Facts:
${caseFacts.substring(0, 3000)}

Identify ALL applicable legal sections from BNS 2023, IPC 1860, NDPS Act, POCSO Act, IT Act, or any other relevant Indian law.

Respond as JSON:
{
  "offenceDate": "YYYY-MM-DD or null",
  "applicableLaw": "BNS" | "IPC" | "BOTH",
  "primarySections": [
    {
      "law": "BNS|IPC|NDPS|POCSO|IT_ACT|CrPC|BNSS",
      "sectionNumber": "e.g. 103(1)",
      "title": "e.g. Murder",
      "punishment": "e.g. Death or life imprisonment with fine",
      "isBailable": false,
      "isCognizable": true,
      "isNonBailable": true,
      "applicabilityReason": "Why this section applies",
      "mappedFrom": {"law": "IPC", "section": "302"} // BNS sections only
    }
  ],
  "additionalSections": [], // Other possible sections
  "bailAssessment": "Overall bail assessment",
  "custodyStatus": "bailable|non-bailable|mixed",
  "recommendedActions": ["immediate actions lawyer should take"],
  "disclaimer": "Legal disclaimer"
}`;

  const result = await callClaudeJSON<SectionIdentificationResult>(prompt);

  // Enrich with DB data
  for (const section of [...result.primarySections, ...result.additionalSections]) {
    const dbSection = await prisma.legalSection.findUnique({
      where: { law_sectionNumber: { law: section.law, sectionNumber: section.sectionNumber } },
    });
    if (dbSection) {
      section.punishment = dbSection.punishment ?? section.punishment;
      section.isBailable = dbSection.isBailable ?? section.isBailable;
      section.isCognizable = dbSection.isCognizable ?? section.isCognizable;
      section.isNonBailable = dbSection.isNonBailable ?? section.isNonBailable;
    }
  }

  return result;
}

export async function getBNSIPCMapping(
  section: string,
  fromLaw: "BNS" | "IPC"
): Promise<{ mappedLaw: string; mappedSection: string; title: string } | null> {
  const toLaw = fromLaw === "BNS" ? "IPC" : "BNS";

  const dbResult = await prisma.legalSection.findFirst({
    where: {
      law: fromLaw,
      sectionNumber: section,
      mappedToLaw: toLaw,
    },
  });

  if (!dbResult?.mappedToSection) return null;

  return {
    mappedLaw: toLaw,
    mappedSection: dbResult.mappedToSection,
    title: dbResult.title,
  };
}
