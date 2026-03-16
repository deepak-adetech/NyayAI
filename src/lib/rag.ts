/**
 * RAG (Retrieval Augmented Generation) Engine for NyayaSahayak
 *
 * Architecture:
 *  1. Legal Knowledge Base  — static Indian law (BNS/IPC/BNSS/CrPC/BSA/IEA + SC judgments)
 *  2. Case Learning         — each lawyer's own cases + notes are indexed for personalised advice
 *  3. Web Fallback          — if local knowledge is thin, surface a web-search suggestion
 *
 * Embedding model: OpenAI text-embedding-3-small (1536 dims, cost-efficient)
 * Vector store:    Supabase pgvector  (legal_documents table)
 */

import OpenAI from "openai";
import { getSupabaseAdmin } from "./supabase";

// ──────────────────────────────────────────────────────────────────────────────
// Lazy init
// ──────────────────────────────────────────────────────────────────────────────

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type RagCategory =
  | "bns_sections"
  | "ipc_sections"
  | "bnss_sections"
  | "crpc_sections"
  | "bsa_sections"
  | "evidence_act"
  | "sc_judgment"
  | "hc_judgment"
  | "bare_act"
  | "legal_article"
  | "procedural_guide"
  | "case_note"       // Lawyer's own case notes (personalized learning)
  | "other";

export interface RagResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  category: RagCategory;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface LegalDocument {
  title: string;
  content: string;
  category: RagCategory;
  source?: string;
  metadata?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Core Functions
// ──────────────────────────────────────────────────────────────────────────────

/** Generate an embedding vector for a text string. */
export async function embedText(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

/** Semantic search over the legal knowledge base + case notes. */
export async function searchLegalKnowledge(
  query: string,
  topK = 6,
  threshold = 0.60,
  lawyerId?: string
): Promise<RagResult[]> {
  try {
    const supabase = getSupabaseAdmin();
    const embedding = await embedText(query);

    const { data, error } = await supabase.rpc("search_legal_documents", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: topK,
      filter_lawyer_id: lawyerId ?? null,
    });

    if (error) {
      console.error("[RAG] search error:", error);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      similarity: row.similarity as number,
      category: row.category as RagCategory,
      source: row.source as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
    }));
  } catch (err) {
    console.error("[RAG] search failed:", err);
    return [];
  }
}

/** Add a legal document (or case note) to the RAG store. */
export async function addLegalDocument(doc: LegalDocument): Promise<{ id: string } | null> {
  try {
    const supabase = getSupabaseAdmin();
    const embedding = await embedText(`${doc.title}\n\n${doc.content}`);

    const { data, error } = await supabase
      .from("legal_documents")
      .insert({
        title: doc.title,
        content: doc.content,
        category: doc.category,
        source: doc.source ?? null,
        metadata: doc.metadata ?? {},
        embedding,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[RAG] add document error:", error);
      return null;
    }

    return { id: data.id };
  } catch (err) {
    console.error("[RAG] addLegalDocument failed:", err);
    return null;
  }
}

/**
 * Index a lawyer's case as a RAG document so AI can recall patterns from their practice.
 * Call this when a case is created/updated, or when notes are added.
 */
export async function indexCaseForLearning(params: {
  lawyerId: string;
  caseId: string;
  caseTitle: string;
  caseType?: string;
  cnrNumber?: string;
  parties?: string;
  charges?: string;
  notes?: string;
  outcome?: string;
  actsSections?: string;
}): Promise<void> {
  const {
    lawyerId,
    caseId,
    caseTitle,
    caseType,
    cnrNumber,
    parties,
    charges,
    notes,
    outcome,
    actsSections,
  } = params;

  const content = [
    caseType && `Case Type: ${caseType}`,
    cnrNumber && `CNR: ${cnrNumber}`,
    parties && `Parties: ${parties}`,
    actsSections && `Acts/Sections: ${actsSections}`,
    charges && `Charges: ${charges}`,
    notes && `Lawyer Notes:\n${notes}`,
    outcome && `Outcome: ${outcome}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!content.trim()) return;

  try {
    const supabase = getSupabaseAdmin();

    // Upsert — delete old entry for same case, then insert fresh
    await supabase
      .from("legal_documents")
      .delete()
      .eq("metadata->>caseId", caseId)
      .eq("metadata->>lawyerId", lawyerId);

    await addLegalDocument({
      title: `My Case: ${caseTitle}`,
      content,
      category: "case_note",
      source: `Lawyer Practice Record — ${caseTitle}`,
      metadata: { lawyerId, caseId, cnrNumber },
    });
  } catch (err) {
    console.error("[RAG] indexCaseForLearning failed:", err);
  }
}

/**
 * Build a rich context string for injecting into an AI prompt.
 * Includes both general legal knowledge AND the lawyer's own case patterns.
 */
export async function buildRagContext(query: string, lawyerId?: string): Promise<string> {
  // Fetch from both general knowledge and personal case notes
  const [generalResults, caseResults] = await Promise.all([
    searchLegalKnowledge(query, 5, 0.60),
    lawyerId ? searchLegalKnowledge(query, 3, 0.55, lawyerId) : Promise.resolve([]),
  ]);

  // Deduplicate by id
  const seen = new Set<string>();
  const all = [...caseResults, ...generalResults].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  if (all.length === 0) return "";

  const caseNotes = all.filter((r) => r.category === "case_note");
  const legalRefs = all.filter((r) => r.category !== "case_note");

  const parts: string[] = [];

  if (caseNotes.length > 0) {
    parts.push(
      "YOUR PAST CASE PATTERNS (from your practice):\n" +
        caseNotes
          .map((r, i) => `[Your Case ${i + 1}] ${r.title}\n${r.content}`)
          .join("\n\n---\n\n")
    );
  }

  if (legalRefs.length > 0) {
    parts.push(
      "RELEVANT INDIAN LEGAL KNOWLEDGE:\n" +
        legalRefs
          .map(
            (r, i) =>
              `[Legal Ref ${i + 1}] ${r.title}\nSource: ${r.source ?? r.category}\n${r.content}`
          )
          .join("\n\n---\n\n")
    );
  }

  return (
    "\n\nKNOWLEDGE BASE CONTEXT:\n" +
    parts.join("\n\n════════════════════\n\n") +
    "\n\nUse the above context to inform your response. Cite legal references where applicable."
  );
}

/** Get document count by category. */
export async function getDocumentStats(): Promise<{ total: number; byCategory: Record<string, number> }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("legal_documents").select("category");

    if (error || !data) return { total: 0, byCategory: {} };

    const byCategory: Record<string, number> = {};
    for (const row of data) {
      byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    }

    return { total: data.length, byCategory };
  } catch {
    return { total: 0, byCategory: {} };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Seed Data — Comprehensive Indian Legal Knowledge Base
// ──────────────────────────────────────────────────────────────────────────────

/** Seed the RAG store with comprehensive Indian legal content. */
export async function seedInitialData(): Promise<{ added: number; errors: string[] }> {
  const seedDocs: LegalDocument[] = [

    // ── BNS 2023 ─────────────────────────────────────────────────────────────

    {
      title: "BNS Section 103 — Murder",
      content:
        "Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine. Murder under BNS 2023 replaces IPC Section 302. Non-bailable, cognizable. Proof required: (a) intent to cause death, (b) knowledge act is likely to cause death, (c) intent to cause bodily injury likely to result in death. Organised crime murder carries death or life imprisonment plus fine of Rs.10 lakh.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.103",
    },
    {
      title: "BNS Section 104 — Culpable Homicide Not Amounting to Murder",
      content:
        "Culpable homicide is not murder when the offender is deprived of the power of self-control by grave and sudden provocation. Punishment: imprisonment up to 10 years and fine (if not murder), or life imprisonment if the act is done with intent to cause death. Replaces IPC Sections 299/304. Cognizable, non-bailable.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.104",
    },
    {
      title: "BNS Section 85 — Cruelty by Husband or His Relatives",
      content:
        "Whoever, being the husband or relative of the husband, subjects the woman to cruelty — wilful conduct driving her to suicide, grave injury to life/limb/health, or harassment to coerce unlawful demand for property — shall be punished with imprisonment up to 3 years and fine. Replaces IPC Section 498A. Cognizable (with conditions per Arnesh Kumar guidelines).",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.85",
    },
    {
      title: "BNS Section 64 — Rape",
      content:
        "Whoever commits rape shall be punished with rigorous imprisonment not less than 10 years, extendable to life, plus fine. Aggravated rape (police officer, public servant, gang rape, victim under 16): minimum 20 years or life. Rape of woman under 12 years: minimum 20 years, may extend to death. Replaces IPC Section 376. Non-bailable, cognizable. Trial in camera mandatory.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.64",
    },
    {
      title: "BNS Section 70 — Gang Rape",
      content:
        "When a woman is raped by one or more persons constituting a group or acting in furtherance of a common intention, each person shall be deemed to have committed rape. Punishment: rigorous imprisonment not less than 20 years, extendable to life for remainder of natural life, plus fine. Non-bailable. Replaces IPC Section 376D.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.70",
    },
    {
      title: "BNS Section 111 — Organised Crime",
      content:
        "Organised crime means any continuing unlawful activity by an individual, singly or jointly, as a member of an organised crime syndicate, using violence/intimidation/coercion/illegal means to obtain pecuniary benefits. Punishment if it results in death: death or life imprisonment plus fine of Rs.10 lakh. Otherwise: imprisonment 5 years to life plus fine of Rs.5 lakh. New section with no direct IPC equivalent.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.111",
    },
    {
      title: "BNS Section 113 — Terrorist Act",
      content:
        "New provision criminalising acts that threaten unity, integrity, sovereignty, security of India or strike terror. Punishable with death or life imprisonment if resulting in death, otherwise 5 years to life. Earlier governed only by UAPA. Cognizable, non-bailable. Includes economic security offences, nuclear/biological/chemical weapon threats.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.113",
    },
    {
      title: "BNS Section 117 — Voluntarily Causing Grievous Hurt",
      content:
        "Whoever voluntarily causes grievous hurt: imprisonment up to 7 years and fine. Grievous hurt includes emasculation, permanent privation of sight/hearing, loss of any limb, permanent disfiguration, fracture of bone/tooth, hurt endangering life, severe bodily pain for 20 days. Replaces IPC Section 325. Cognizable, bailable.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.117",
    },
    {
      title: "BNS Section 316 — Cheating",
      content:
        "Whoever cheats shall be punished with imprisonment up to 3 years, or fine, or both. Cheating and dishonestly inducing delivery of property or alteration of document: imprisonment up to 7 years and fine. Replaces IPC Sections 415/420. Cognizable, bailable (simple cheating) or non-bailable (aggravated).",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.316",
    },
    {
      title: "BNS Section 61 — Criminal Conspiracy",
      content:
        "Two or more persons agreeing to do or cause to be done an illegal act, or a legal act by illegal means. Punishment: imprisonment up to 6 months or fine or both (if the offence is punishable with 2 years or less); otherwise same punishment as the abetted offence. Replaces IPC Section 120B.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.61",
    },
    {
      title: "BNS Section 3(5) — Common Intention (Constructive Liability)",
      content:
        "When a criminal act is done by several persons in furtherance of the common intention of all, each of such persons is liable for that act in the same manner as if it were done by him alone. Replaces IPC Section 34. Key principle for group crime, conspiracy, and joint liability. Applies to 2+ persons.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.3(5)",
    },
    {
      title: "BNS Section 80 — Dowry Death",
      content:
        "Where the death of a woman is caused by any burns or bodily injury or occurs under suspicious circumstances within seven years of marriage and it is shown that she was subjected to cruelty or harassment by her husband or any relative of her husband for, or in connection with, any demand for dowry, such death shall be called 'dowry death'. Punishable with imprisonment not less than 7 years, extendable to life. Replaces IPC Section 304B. Presumption of guilt applies (BSA S.118). Non-bailable, cognizable.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.80",
    },
    {
      title: "BNS Section 309 — Dacoity",
      content:
        "When five or more persons conjointly commit or attempt to commit a robbery, or where the whole number of persons conjointly committing or attempting to commit a robbery, and persons present and aiding such commission or attempt, amount to five or more, every person so committing, attempting or aiding, is said to commit 'dacoity'. Punishment: rigorous imprisonment up to 10 years and fine. Replaces IPC Section 391/395.",
      category: "bns_sections",
      source: "Bharatiya Nyaya Sanhita 2023, S.309",
    },

    // ── BNSS 2023 ─────────────────────────────────────────────────────────────

    {
      title: "BNSS Section 173 — FIR Registration",
      content:
        "Every information relating to cognizable offence, if given orally to officer in charge, shall be reduced to writing and read over to the informant, signed/thumb-printed, and a copy given free of cost. Must register immediately. No preliminary enquiry for cognizable offences (Lalita Kumari). Copy to Magistrate forthwith. Zero FIR to be transferred within 15 days. Online FIR allowed for specified offences. Replaces CrPC Section 154.",
      category: "bnss_sections",
      source: "Bharatiya Nagarik Suraksha Sanhita 2023, S.173",
    },
    {
      title: "BNSS Section 480 — Bail in Bailable Offences",
      content:
        "In all bailable offences, person shall be released on bail as a matter of right. Officer or court shall release on bail immediately upon arrest. Bail may be with or without sureties. For person unable to furnish bail, may be dispensed with on personal bond. Replaces CrPC Section 436. Indigent accused entitled to release without surety.",
      category: "bnss_sections",
      source: "Bharatiya Nagarik Suraksha Sanhita 2023, S.480",
    },
    {
      title: "BNSS Section 483 — Bail in Non-Bailable Offences",
      content:
        "Court may grant bail for non-bailable offences. Shall not be granted to person accused of offence punishable with death/life imprisonment (unless woman, child under 16, sick/infirm). Court considers: nature of accusation, previous convictions, likelihood of fleeing, character. Bail is rule, jail is exception (SC). Replaces CrPC Section 437.",
      category: "bnss_sections",
      source: "Bharatiya Nagarik Suraksha Sanhita 2023, S.483",
    },
    {
      title: "BNSS Section 484 — Anticipatory Bail",
      content:
        "Where person has reason to believe arrest may be made for non-bailable offence, may apply to Sessions Court or High Court. Court may impose conditions: available for interrogation, not leave India, surrender passport, not tamper with evidence, not contact witnesses. Court shall consider gravity, prior convictions, possibility of fleeing. Replaces CrPC Section 438.",
      category: "bnss_sections",
      source: "Bharatiya Nagarik Suraksha Sanhita 2023, S.484",
    },
    {
      title: "BNSS Section 35 — Arrest Without Warrant",
      content:
        "Police officer may arrest without warrant persons committing cognizable offences in presence; persons against whom reasonable complaint has been made; persons who have been proclaimed offenders; persons in possession of stolen property; persons obstructing police. Officer must record reasons in police diary. Inform person of grounds immediately. Replaces CrPC Section 41. Arnesh Kumar guidelines apply.",
      category: "bnss_sections",
      source: "Bharatiya Nagarik Suraksha Sanhita 2023, S.35",
    },
    {
      title: "BNSS Section 187 — Remand Procedure and Default Bail",
      content:
        "Police cannot detain person for more than 24 hours without producing before Magistrate. Magistrate may authorise detention in judicial or police custody up to 15 days (police custody up to 7 days). Maximum total remand: 60 days (offences punishable with death/life/10+ years), 30 days (other). If chargesheet not filed within time, accused entitled to default bail. Default bail is absolute right. Replaces CrPC Section 167.",
      category: "bnss_sections",
      source: "Bharatiya Nagarik Suraksha Sanhita 2023, S.187",
    },

    // ── BSA 2023 ──────────────────────────────────────────────────────────────

    {
      title: "BSA 2023 — Electronic Evidence (Sections 57-65)",
      content:
        "BSA 2023 expands admissibility of electronic evidence. Emails, WhatsApp messages, social media posts, CCTV footage, digital audio/video are admissible. Certificate under Section 63 required for secondary electronic evidence. Replaces IEA Sections 65A/65B. Section 57 BSA: all electronic records are documentary evidence. Courts may summon electronic records from any service provider.",
      category: "bsa_sections",
      source: "Bharatiya Sakshya Adhiniyam 2023, S.57-65",
    },
    {
      title: "BSA Section 26 — Confessions to Police Officer",
      content:
        "No confession made by a person to a police officer shall be proved against him. However, the discovery statement (so much of the information as relates distinctly to fact discovered) is admissible under Section 27. Confessions before Magistrate (S.183) are admissible. Confession must be voluntary, not obtained by inducement, threat or promise. Replaces IEA Sections 25/26/27.",
      category: "bsa_sections",
      source: "Bharatiya Sakshya Adhiniyam 2023, S.26",
    },

    // ── IPC 1860 (Pre-July 2024) ──────────────────────────────────────────────

    {
      title: "IPC Section 302 — Punishment for Murder (Pre-July 2024)",
      content:
        "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine. Applies to offences committed BEFORE July 1, 2024. After July 1, 2024, BNS Section 103 applies. Non-bailable, cognizable. Death penalty requires rarest of rare doctrine (Bachan Singh v State of Punjab, AIR 1980 SC 898).",
      category: "ipc_sections",
      source: "Indian Penal Code 1860, S.302",
    },
    {
      title: "IPC Section 498A — Cruelty by Husband (Pre-July 2024)",
      content:
        "Whoever, being the husband or relative of the husband, subjects woman to cruelty: imprisonment up to 3 years and fine. Applies to offences before July 1, 2024 (after: BNS Section 85). Cognizable, non-bailable but Arnesh Kumar mandated police not to make automatic arrests without checklist.",
      category: "ipc_sections",
      source: "Indian Penal Code 1860, S.498A",
    },
    {
      title: "BNS/IPC/BNSS/CrPC Transition Rule — July 1, 2024",
      content:
        "BNS 2023, BNSS 2023, and BSA 2023 came into force on July 1, 2024. Critical rule: for offences committed BEFORE July 1, 2024 — IPC 1860 + CrPC 1973 + IEA 1872 apply. For offences ON OR AFTER July 1, 2024 — BNS 2023 + BNSS 2023 + BSA 2023 apply. Pending cases where offence was before July 1, 2024 continue under old law. Always verify date of offence first.",
      category: "legal_article",
      source: "Ministry of Home Affairs Notification, June 2024",
    },

    // ── Supreme Court Judgments ───────────────────────────────────────────────

    {
      title: "Arnesh Kumar v State of Bihar (2014) — Arrest Guidelines for 498A/Matrimonial",
      content:
        "Supreme Court guidelines for arrest in IPC S.498A (BNS S.85) and Dowry Prohibition Act cases. Police must satisfy arrest is necessary; fill BNSS S.35 checklist. Magistrate must apply mind before authorising detention. If magistrate authorises detention without reasons, it is illegal. Police diary must record reasons. Broadly applicable to all cognizable offences.",
      category: "sc_judgment",
      source: "Arnesh Kumar v State of Bihar, (2014) 8 SCC 273",
    },
    {
      title: "Lalita Kumari v Government of UP (2013) — Mandatory FIR Registration",
      content:
        "Constitution Bench held registration of FIR under S.154 CrPC (BNSS S.173) is mandatory when information discloses cognizable offence. No preliminary inquiry permissible. Exceptions for matrimonial/family disputes, commercial offences, corruption (preliminary inquiry up to 7 days allowed). If police refuse, complainant can approach SP. Mandatory compliance.",
      category: "sc_judgment",
      source: "Lalita Kumari v Govt of UP, (2014) 2 SCC 1",
    },
    {
      title: "Satender Kumar Antil v CBI (2022) — Bail Reform Directive",
      content:
        "SC directed courts to be liberal in granting bail in non-heinous offences. Prolonged incarceration without trial is violation of Article 21. Courts must consider: nature of offence, evidence, antecedents, likelihood of flight, obstruction of trial. Bail conditions must be proportionate. Directed states to reduce undertrial population. Bail is the rule, jail is the exception.",
      category: "sc_judgment",
      source: "Satender Kumar Antil v CBI, (2022) 10 SCC 51",
    },
    {
      title: "Bachan Singh v State of Punjab (1980) — Rarest of Rare for Death Penalty",
      content:
        "Death penalty shall be imposed only in rarest of rare cases when alternative option is unquestionably foreclosed. Aggravating factors: extremely brutal manner, perverse motive, prior criminal record. Mitigating factors: age, mental state, possibility of reform. Balance sheet of aggravating vs mitigating circumstances must be drawn by courts. Foundation for all death penalty cases.",
      category: "sc_judgment",
      source: "Bachan Singh v State of Punjab, AIR 1980 SC 898",
    },
    {
      title: "Maneka Gandhi v Union of India (1978) — Article 21 Liberty",
      content:
        "Life and personal liberty under Art.21 cannot be deprived except by procedure established by law, which must be fair, just, and reasonable. Arbitrary detention is unconstitutional. Right to fair trial, right to legal aid, right to be heard — all part of Art.21. Foundation for bail jurisprudence and speedy trial rights in India.",
      category: "sc_judgment",
      source: "Maneka Gandhi v Union of India, AIR 1978 SC 597",
    },
    {
      title: "Prathvi Raj Chauhan v Union of India (2020) — SC/ST Act Anticipatory Bail",
      content:
        "SC held that anticipatory bail can be granted in SC/ST Atrocities Act cases. However, prior notice to public prosecutor and victim must be given before granting anticipatory bail. 2018 Amendment requiring no preliminary inquiry before arrest upheld. Investigation by DSP or above mandatory. Offender need not be at scene of crime — can be proved by other evidence.",
      category: "sc_judgment",
      source: "Prathvi Raj Chauhan v Union of India, AIR 2020 SC 1036",
    },

    // ── Bare Acts ─────────────────────────────────────────────────────────────

    {
      title: "POCSO Act 2012 — Child Sexual Offences",
      content:
        "POCSO Act protects children (under 18) from sexual offences. All POCSO offences are cognizable, non-bailable. Presumption of guilt: if prosecution proves penetrative sexual assault, accused is presumed guilty unless proved otherwise (S.29). Child's statement to be recorded by woman officer; Magistrate to record statement. Special Court trial. Victim identity cannot be disclosed. Bail requires consideration of safety of child. Medical examination within 24 hours. Report to CWC mandatory.",
      category: "bare_act",
      source: "Protection of Children from Sexual Offences Act 2012",
    },
    {
      title: "NDPS Act 1985 — Bail Under Section 37",
      content:
        "NDPS Act Section 37 imposes double lock on bail: Court must be satisfied that (a) there are reasonable grounds to believe accused is NOT guilty, AND (b) is not likely to commit any offence while on bail. Applies when quantity is commercial or above. For small/intermediate quantity: normal bail considerations. Commercial quantity varies by drug (heroin: 250 grams; cannabis: 1 kg; cocaine: 100 grams). Burden on accused to rebut.",
      category: "bare_act",
      source: "Narcotic Drugs and Psychotropic Substances Act 1985, S.37",
    },
    {
      title: "SC/ST Atrocities Act — Key Provisions",
      content:
        "SC/ST (Prevention of Atrocities) Act 1989: offences against Scheduled Castes/Tribes. Key: insult, intimidation, assault, sexual exploitation by non-SC/ST in public view. Punishment: 6 months to 5 years. Special Court exclusively tries these offences. 2018 Amendment: preliminary inquiry before arrest not required. Investigation by DSP or above only. Victim prior notice needed for anticipatory bail (Prathvi Raj Chauhan).",
      category: "bare_act",
      source: "SC/ST (Prevention of Atrocities) Act 1989",
    },
    {
      title: "Domestic Violence Act 2005 — Protection and Remedies",
      content:
        "DV Act covers physical, sexual, verbal, emotional, and economic abuse. Remedies: protection order, residence order (cannot be thrown out of shared household), maintenance order, compensation order, custody order. Application before Magistrate — can pass ex-parte interim order. Protection Officer must file domestic incident report. DV Act is in addition to 498A/BNS S.85 — both can be filed simultaneously.",
      category: "bare_act",
      source: "Protection of Women from Domestic Violence Act 2005",
    },

    // ── Procedural Guides ─────────────────────────────────────────────────────

    {
      title: "Bail Application — Step-by-Step Procedure in India",
      content:
        "1. BAILABLE OFFENCE: Apply at police station (BNSS S.480); if refused, apply to Magistrate. 2. NON-BAILABLE OFFENCE: Regular bail before Magistrate/Sessions Court (BNSS S.483); if rejected, approach HC under S.528. 3. ANTICIPATORY BAIL (BNSS S.484): Apply to Sessions Court first; if rejected, approach HC. 4. BAIL DURING TRIAL: Sessions Court or HC. 5. BAIL PENDING APPEAL: HC or SC. Key points: attach clear facts, case diary, personal circumstances, co-accused bail status.",
      category: "procedural_guide",
      source: "NyayaSahayak Practice Guide",
    },
    {
      title: "FIR: What to Do When Police Refuse to Register",
      content:
        "If police refuse to register FIR: 1. Approach Superintendent of Police with written complaint (BNSS S.173(4)). 2. Send complaint by post to SP. 3. File private complaint before Magistrate under BNSS S.223. 4. File writ petition in HC seeking directions to register FIR. 5. Complaint to State Human Rights Commission. Lalita Kumari: registration is mandatory for cognizable offences. Refusing officer commits misconduct.",
      category: "procedural_guide",
      source: "NyayaSahayak Practice Guide",
    },
    {
      title: "Chargesheet Timelines and Default Bail",
      content:
        "Police must file chargesheet within: 60 days (offences punishable with death/life/10+ years), 30 days (other offences). Period begins from first remand date. If chargesheet not filed within time, accused entitled to default bail (BNSS S.187). Default bail is absolute right — court cannot impose conditions. Move default bail application BEFORE chargesheet is filed. Incomplete chargesheets (investigation continues) do not defeat default bail right.",
      category: "procedural_guide",
      source: "NyayaSahayak Practice Guide",
    },
    {
      title: "Dowry Death — Investigation and Trial Checklist",
      content:
        "Dowry death (BNS S.80 / IPC S.304B): death within 7 years of marriage. Prosecution must prove: (a) death by burns/bodily injury or unnatural circumstances, (b) within 7 years of marriage, (c) cruelty or harassment for dowry before death. Presumption under BSA S.118 / IEA S.113B applies. BNSS mandatory Magistrate inquest. Post-mortem mandatory. Preserve viscera samples. Timeline and call records are critical evidence.",
      category: "procedural_guide",
      source: "NyayaSahayak Practice Guide",
    },
    {
      title: "Legal Aid — Right to Free Legal Services",
      content:
        "Right to free legal aid is part of Article 21 (fair trial — Hussainara Khatoon 1979). Legal Services Authorities Act 1987: State LSAs provide free aid to persons with income below Rs.3 lakh (varies by state), women in all matters, children, SC/ST persons, trafficking victims, mentally ill. Even if accused does not ask, court must inform. NALSA oversees national legal services. Absence of legal representation vitiates trial.",
      category: "procedural_guide",
      source: "Legal Services Authorities Act 1987; Art.22(1) Constitution",
    },
    {
      title: "Consumer Forum — Filing Procedure and Limitation",
      content:
        "Consumer Protection Act 2019. Jurisdiction: District Commission up to Rs.50 lakh; State Commission Rs.50 lakh to Rs.2 crore; National Commission above Rs.2 crore. Limitation: 2 years from cause of action (condonable with sufficient cause). File complaint with affidavit, supporting documents, 4 copies. Opposite party to reply within 30 days. Mediation mandatory before proceeding. Compensation, refund, replacement, punitive damages available.",
      category: "procedural_guide",
      source: "Consumer Protection Act 2019",
    },
  ];

  let added = 0;
  const errors: string[] = [];

  for (const doc of seedDocs) {
    try {
      const result = await addLegalDocument(doc);
      if (result) {
        added++;
      } else {
        errors.push(`Failed to add: ${doc.title}`);
      }
    } catch (err) {
      errors.push(`Error adding "${doc.title}": ${String(err)}`);
    }
    // Avoid OpenAI embedding rate limit
    await new Promise((r) => setTimeout(r, 150));
  }

  return { added, errors };
}
