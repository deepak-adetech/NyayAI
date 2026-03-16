import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addLegalDocument, RagCategory } from "@/lib/rag";

/**
 * POST /api/admin/rag/sync
 * Auto-syncs legal content from free public sources.
 * Currently seeds additional BNS/IPC sections and procedural guides.
 * Can be extended to fetch from Indian Kanoon or other legal APIs.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { source = "all" } = await req.json().catch(() => ({}));

  const results = { added: 0, updated: 0, errors: [] as string[] };

  // Additional BNS sections to sync
  const additionalDocs: Array<{
    title: string;
    content: string;
    category: RagCategory;
    source: string;
  }> = [
    {
      title: "BNS Section 303 - Theft",
      content: "Whoever, intending to take dishonestly any moveable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft. Punishment: Imprisonment up to 3 years, or fine, or both. Cognizable, bailable before first conviction. Corresponds to IPC Section 378-379.",
      category: "bns_sections",
      source: "BNS 2023",
    },
    {
      title: "BNS Section 316 - Criminal Breach of Trust",
      content: "Whoever, being in any manner entrusted with property, or with any dominion over property, dishonestly misappropriates or converts to his own use that property, or dishonestly uses or disposes of that property in violation of any direction of law, commits criminal breach of trust. Punishment: Up to 3 years imprisonment with fine, or both. Cognizable, non-bailable. Corresponds to IPC Section 405-406.",
      category: "bns_sections",
      source: "BNS 2023",
    },
    {
      title: "BNS Section 318 - Cheating",
      content: "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, and which act or omission causes or is likely to cause damage or harm to that person in body, mind, reputation or property, is said to cheat. Punishment: Up to 3 years or fine or both. Corresponds to IPC Section 415-420.",
      category: "bns_sections",
      source: "BNS 2023",
    },
    {
      title: "Domestic Violence Act 2005 - Key Provisions",
      content: "The Protection of Women from Domestic Violence Act 2005 provides civil remedies to women in domestic relationships who have experienced domestic violence. Key remedies include: Protection Orders, Residence Orders, Monetary Relief, Custody Orders, and Compensation Orders. A Magistrate can grant ex-parte temporary orders in urgent cases. The Act covers not only physical violence but also sexual, verbal, emotional, and economic abuse. Advocates should file under both DV Act 2005 and BNS Section 85 (formerly IPC 498A) for comprehensive protection.",
      category: "bare_act",
      source: "Protection of Women from Domestic Violence Act 2005",
    },
    {
      title: "Criminal Procedure - Charge Sheet Timeline",
      content: "Under BNSS (formerly CrPC), the police must file a charge sheet (Final Report under Section 193 BNSS, formerly Section 173 CrPC) within 60 days for offences punishable with death or life imprisonment, and within 90 days for other serious offences. Failure to file within this period entitles the accused to default bail under Section 187(2) BNSS (formerly Section 167(2) CrPC). Default bail is a right that cannot be denied once the period expires without charge sheet. Accused must apply before the charge sheet is filed to claim default bail.",
      category: "procedural_guide",
      source: "BNSS 2023 Procedural Guide",
    },
    {
      title: "How to File a Writ Petition under Article 226",
      content: "Under Article 226 of the Constitution, the High Court can issue writs including Habeas Corpus, Mandamus, Certiorari, Prohibition, and Quo Warranto. For Habeas Corpus: File petition with personal details of detainee, authority holding detention, grounds of illegality. For Mandamus: File when a public authority fails to perform a mandatory public duty. Certiorari lies when an inferior court acts without jurisdiction or contrary to principles of natural justice. Format: Title (Petitioner v Respondent), grounds, prayer, affidavit verifying petition.",
      category: "procedural_guide",
      source: "High Court Practice Guide",
    },
    {
      title: "IPC Section 420 - Cheating (Pre-July 2024)",
      content: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine. Applies to offences before July 1, 2024. After July 1, 2024, BNS Section 318 applies.",
      category: "ipc_sections",
      source: "Indian Penal Code 1860",
    },
  ];

  for (const doc of additionalDocs) {
    try {
      const result = await addLegalDocument(doc);
      if (result) results.added++;
      else results.errors.push(`Failed: ${doc.title}`);
    } catch (err) {
      results.errors.push(`Error: ${doc.title}: ${err}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  return NextResponse.json({
    success: true,
    ...results,
    syncedAt: new Date().toISOString(),
    source,
  });
}
