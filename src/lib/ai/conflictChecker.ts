/**
 * Conflict of Interest Checker — NyayAI
 *
 * Checks if new case parties conflict with existing clients.
 */

import { prisma } from "@/lib/prisma";

export interface ConflictMatch {
  existingCaseId: string;
  existingCaseTitle: string;
  matchedParty: string;
  matchedAgainst: string;
  role: "petitioner" | "respondent";
  conflictType: "DIRECT_ADVERSE" | "POTENTIAL";
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: ConflictMatch[];
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Check if one contains the other (handles "Ram" vs "Shri Ram" or "Ram Kumar" vs "Ram Kumar Singh")
  if (na.length > 3 && nb.length > 3) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  return false;
}

export async function checkConflictOfInterest(
  lawyerId: string,
  newPetitioners: string[],
  newRespondents: string[]
): Promise<ConflictResult> {
  const existingCases = await prisma.case.findMany({
    where: {
      lawyerId,
      status: { in: ["ACTIVE", "STAYED"] },
    },
    select: {
      id: true,
      title: true,
      petitionerNames: true,
      respondentNames: true,
    },
  });

  const conflicts: ConflictMatch[] = [];

  for (const existingCase of existingCases) {
    // Check: new petitioner appears as existing respondent (direct adverse)
    for (const newPet of newPetitioners) {
      for (const existResp of existingCase.respondentNames) {
        if (namesMatch(newPet, existResp)) {
          conflicts.push({
            existingCaseId: existingCase.id,
            existingCaseTitle: existingCase.title,
            matchedParty: newPet,
            matchedAgainst: existResp,
            role: "respondent",
            conflictType: "DIRECT_ADVERSE",
          });
        }
      }
    }

    // Check: new respondent appears as existing petitioner (direct adverse)
    for (const newResp of newRespondents) {
      for (const existPet of existingCase.petitionerNames) {
        if (namesMatch(newResp, existPet)) {
          conflicts.push({
            existingCaseId: existingCase.id,
            existingCaseTitle: existingCase.title,
            matchedParty: newResp,
            matchedAgainst: existPet,
            role: "petitioner",
            conflictType: "DIRECT_ADVERSE",
          });
        }
      }
    }

    // Potential: new petitioner is also a petitioner in another case where respondent overlaps
    for (const newResp of newRespondents) {
      for (const existResp of existingCase.respondentNames) {
        if (namesMatch(newResp, existResp)) {
          // Same respondent in multiple cases — potential conflict if representing both sides
          // This is informational only
        }
      }
    }
  }

  // Deduplicate
  const uniqueConflicts = conflicts.filter(
    (c, i, arr) =>
      arr.findIndex(
        (x) =>
          x.existingCaseId === c.existingCaseId &&
          normalize(x.matchedParty) === normalize(c.matchedParty)
      ) === i
  );

  return {
    hasConflict: uniqueConflicts.length > 0,
    conflicts: uniqueConflicts,
  };
}
