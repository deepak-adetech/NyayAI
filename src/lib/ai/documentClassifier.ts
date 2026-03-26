/**
 * AI Document Classifier
 * Classifies uploaded documents and extracts metadata.
 * Used by both manual uploads and the file sync service.
 */
import { callClaudeJSON } from "./anthropic";
import { DocumentType } from "@prisma/client";

interface DocumentClassificationResult {
  documentType: DocumentType;
  confidence: number;
  suggestedTitle: string;
  extractedCaseNumber: string | null;
  extractedFIRNumber: string | null;
  extractedCNR: string | null;
  extractedCourtName: string | null;
  extractedParties: {
    petitioners: string[];
    respondents: string[];
  };
  extractedSections: string[];
  extractedDates: {
    type: string; // "filing_date" | "hearing_date" | "order_date"
    date: string; // ISO format
  }[];
  suggestedCaseTitle: string | null;
  summary: string;
  language: string; // "Hindi" | "English" | "Marathi" | "Tamil" etc.
  isHandwritten: boolean;
  ocrNeeded: boolean;
}

const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  fir: "FIR",
  chargesheet: "CHARGESHEET",
  judgment: "JUDGMENT",
  order: "ORDER",
  petition: "PETITION",
  bail_application: "BAIL_APPLICATION",
  written_statement: "WRITTEN_STATEMENT",
  plaint: "PLAINT",
  reply: "REPLY",
  affidavit: "AFFIDAVIT",
  vakalatnama: "VAKALATNAMA",
  agreement: "AGREEMENT",
  notice: "NOTICE",
  cause_list: "CAUSE_LIST",
  evidence: "EVIDENCE",
  client_document: "CLIENT_DOCUMENT",
  other: "OTHER",
};

export async function classifyDocument(
  text: string,
  fileName: string
): Promise<DocumentClassificationResult> {
  const truncatedText = text.substring(0, 30000);

  const prompt = `Analyze this Indian legal document text and classify it. Provide a comprehensive and detailed analysis.

Filename: ${fileName}
Content (first 30000 chars):
${truncatedText}

Identify the document type from: FIR, CHARGESHEET, JUDGMENT, ORDER, PETITION, BAIL_APPLICATION, WRITTEN_STATEMENT, PLAINT, REPLY, AFFIDAVIT, VAKALATNAMA, AGREEMENT, NOTICE, CAUSE_LIST, EVIDENCE, CLIENT_DOCUMENT, OTHER

Extract all available information:
- Case number, FIR number, CNR number
- Court name and district
- Party names (petitioners/respondents)
- Applicable BNS/IPC/other sections mentioned
- Important dates (filing, hearing, order)
- Primary language of the document
- Whether OCR processing is needed

For the "summary" field, provide a COMPREHENSIVE ANALYSIS (not just 2-3 sentences) structured as follows:

**Summary**: A detailed 5-10 sentence summary covering all key facts, background, and context of the case or document.

**Key Findings/Orders**: What the court ordered, directed, or held. Include all operative directions, conditions imposed, and compliance requirements.

**Parties Involved**: Full names and roles of all parties (petitioners, respondents, advocates, judges, witnesses, etc.).

**Dates Mentioned**: All important dates including filing date, hearing dates, order date, next date of hearing, and any other significant dates referenced in the document.

**Legal Provisions Cited**: All acts, sections, rules, articles, and legal precedents referenced (e.g., IPC/BNS sections, CrPC/BNSS provisions, Constitutional articles, specific case law cited).

**Relief Sought/Granted**: What relief or remedy was sought by the parties and what was actually granted or denied by the court.

**Current Status**: The current status of the case after this document — whether disposed, pending, adjourned, reserved for orders, etc.

Format the summary field as a single string with the above sections separated by newlines, using the bold section headers shown above.

Respond as JSON:
{
  "documentType": "one of the types above",
  "confidence": 0.95,
  "suggestedTitle": "Human-readable title for this document",
  "extractedCaseNumber": null,
  "extractedFIRNumber": null,
  "extractedCNR": null,
  "extractedCourtName": null,
  "extractedParties": {"petitioners": [], "respondents": []},
  "extractedSections": [],
  "extractedDates": [{"type": "hearing_date", "date": "2024-03-15"}],
  "suggestedCaseTitle": "State vs. [Name] or [Party A] vs [Party B]",
  "summary": "Comprehensive analysis with all sections described above",
  "language": "Hindi|English|Marathi|etc",
  "isHandwritten": false,
  "ocrNeeded": false
}`;

  const result = await callClaudeJSON<DocumentClassificationResult & { documentType: string }>(
    prompt,
    `You are an expert Indian legal document analyzer. Extract information precisely from Indian court documents, FIRs, and legal filings. Always respond with valid JSON only.`
  );

  // Normalize document type
  const normalizedType =
    DOCUMENT_TYPE_MAP[result.documentType.toLowerCase()] ?? "OTHER";

  return {
    ...result,
    documentType: normalizedType as DocumentType,
  };
}

export async function matchDocumentToCase(
  classification: DocumentClassificationResult,
  lawyerId: string
): Promise<string | null> {
  const { prisma } = await import("@/lib/prisma");

  // Try CNR number first (most reliable)
  if (classification.extractedCNR) {
    const case_ = await prisma.case.findFirst({
      where: { lawyerId, cnrNumber: classification.extractedCNR },
    });
    if (case_) return case_.id;
  }

  // Try case number
  if (classification.extractedCaseNumber) {
    const case_ = await prisma.case.findFirst({
      where: { lawyerId, caseNumber: { contains: classification.extractedCaseNumber } },
    });
    if (case_) return case_.id;
  }

  // Try FIR number
  if (classification.extractedFIRNumber) {
    const case_ = await prisma.case.findFirst({
      where: { lawyerId, firNumber: classification.extractedFIRNumber },
    });
    if (case_) return case_.id;
  }

  // Try case title matching with parties
  if (classification.extractedParties.petitioners.length > 0) {
    const petitioner = classification.extractedParties.petitioners[0];
    const case_ = await prisma.case.findFirst({
      where: {
        lawyerId,
        status: "ACTIVE",
        petitionerNames: { has: petitioner },
      },
    });
    if (case_) return case_.id;
  }

  return null;
}
