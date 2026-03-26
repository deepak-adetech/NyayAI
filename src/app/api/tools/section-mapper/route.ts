import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { callClaudeJSON } from "@/lib/ai/anthropic";

const schema = z.object({
  query: z.string().min(1).max(200),
  direction: z.enum(["IPC_TO_BNS", "BNS_TO_IPC", "SEARCH"]).default("SEARCH"),
});

interface MappedSection {
  law: string;
  sectionNumber: string;
  title: string;
  fullText?: string;
  punishment?: string | null;
  isBailable?: boolean | null;
  isCognizable?: boolean | null;
  isCompoundable?: boolean | null;
  isNonBailable?: boolean | null;
  mappedLaw?: string | null;
  mappedSection?: string | null;
  mappedTitle?: string | null;
  mappedPunishment?: string | null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { query, direction } = data;
  const q = query.trim();

  try {
    // Step 1: Search database
    const lawFilter = direction === "IPC_TO_BNS" ? "IPC" : direction === "BNS_TO_IPC" ? "BNS" : undefined;

    const dbResults = await prisma.legalSection.findMany({
      where: {
        AND: [
          lawFilter ? { law: lawFilter } : {},
          {
            OR: [
              { sectionNumber: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { keywords: { has: q.toLowerCase() } },
            ],
          },
        ],
      },
      take: 20,
      orderBy: { sectionNumber: "asc" },
    });

    // Step 2: For each result, fetch the mapped section
    const results: MappedSection[] = [];

    for (const section of dbResults) {
      const mapped: MappedSection = {
        law: section.law,
        sectionNumber: section.sectionNumber,
        title: section.title,
        fullText: section.fullText,
        punishment: section.punishment,
        isBailable: section.isBailable,
        isCognizable: section.isCognizable,
        isCompoundable: section.isCompoundable,
        isNonBailable: section.isNonBailable,
        mappedLaw: section.mappedToLaw,
        mappedSection: section.mappedToSection,
      };

      // Fetch the mapped section details if available
      if (section.mappedToLaw && section.mappedToSection) {
        const mappedRecord = await prisma.legalSection.findUnique({
          where: {
            law_sectionNumber: {
              law: section.mappedToLaw,
              sectionNumber: section.mappedToSection,
            },
          },
        });
        if (mappedRecord) {
          mapped.mappedTitle = mappedRecord.title;
          mapped.mappedPunishment = mappedRecord.punishment;
        }
      }

      results.push(mapped);
    }

    // Step 3: Claude fallback if no DB results
    if (results.length === 0) {
      const claudeResult = await callClaudeJSON<{
        sections: Array<{
          law: string;
          sectionNumber: string;
          title: string;
          punishment: string;
          isBailable: boolean | null;
          isCognizable: boolean | null;
          mappedLaw: string | null;
          mappedSection: string | null;
          mappedTitle: string | null;
        }>;
      }>(`
You are an expert on Indian criminal law. The user is searching for: "${q}"
Direction: ${direction}

Find the matching legal section(s) and their BNS↔IPC equivalents.

Return JSON:
{
  "sections": [
    {
      "law": "BNS" or "IPC",
      "sectionNumber": "e.g. 302",
      "title": "Section title",
      "punishment": "Punishment description",
      "isBailable": true/false/null,
      "isCognizable": true/false/null,
      "mappedLaw": "BNS" or "IPC" (the equivalent in the other code),
      "mappedSection": "equivalent section number",
      "mappedTitle": "equivalent section title"
    }
  ]
}

Rules:
- BNS 2023 replaced IPC 1860 from 1 July 2024
- If searching IPC, show the BNS equivalent as mapped
- If searching BNS, show the IPC equivalent as mapped
- Include up to 5 most relevant matches
- If no match found, return empty sections array
`);

      if (claudeResult?.sections) {
        for (const s of claudeResult.sections) {
          results.push({
            law: s.law,
            sectionNumber: s.sectionNumber,
            title: s.title,
            punishment: s.punishment,
            isBailable: s.isBailable,
            isCognizable: s.isCognizable,
            mappedLaw: s.mappedLaw,
            mappedSection: s.mappedSection,
            mappedTitle: s.mappedTitle,
          });
        }
      }
    }

    return NextResponse.json({ results, source: dbResults.length > 0 ? "database" : "ai" });
  } catch (error) {
    console.error("[section-mapper] Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
