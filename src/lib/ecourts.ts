/**
 * eCourts India — Case Lookup Engine
 *
 * Uses the ecourtsindia.com partner API (official, no CAPTCHA).
 * Docs: https://ecourtsindia.com/api/docs
 * Auth: Bearer token via ECOURTS_API_KEY env var
 * Endpoint: GET https://ecourtsindia.com/api/partner/case/{cnr}
 */

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ECourtHearing {
  businessDate: string;
  hearingDate: string;
  purpose: string;
}

export interface ECourtOrder {
  orderDate: string;
  orderDetails: string;
  orderLink?: string;
}

export interface ECourtParty {
  name: string;
  advocateName: string;
}

export interface ECourtAct {
  act: string;
  sections: string;
}

export interface ECourtCase {
  cnrNumber: string;
  caseType: string;
  registrationNumber: string;
  registrationDate: string | null;
  filingDate: string | null;
  caseStatus: string;
  natureOfDisposal: string | null;
  firstHearingDate: string | null;
  decisionDate: string | null;
  courtName: string;
  courtNumber: string;
  judge: string;
  petitioners: ECourtParty[];
  respondents: ECourtParty[];
  acts: ECourtAct[];
  hearingHistory: ECourtHearing[];
  nextHearingDate: string | null;
  orders: ECourtOrder[];
  _source?: "api" | "web";
}

export class ECourtAPIError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "ECourtAPIError";
    this.statusCode = statusCode;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.ECOURTS_API_KEY ?? "";
const BASE_URL = "https://webapi.ecourtsindia.com/api/partner";
const TIMEOUT = 15_000;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseECourtDate(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "NA" || s === "-") return null;
  // DD-MM-YYYY or DD/MM/YYYY
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function deriveNextHearingDate(hearings: ECourtHearing[]): string | null {
  if (!hearings.length) return null;
  const now = new Date();
  const dates = hearings
    .map(h => parseECourtDate(h.hearingDate))
    .filter((d): d is string => !!d)
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
  const future = dates.filter(d => d >= now);
  if (future.length) return future[0].toISOString();
  const past = dates.filter(d => d < now);
  return past.length ? past[past.length - 1].toISOString() : null;
}

// ─── Normalise ecourtsindia.com (webapi) response ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseResponse(raw: Record<string, any>, cnr: string): ECourtCase {
  // Response: { data: { courtCaseData, entityInfo, files, descriptions, caseAiAnalysis }, meta }
  const payload = raw.data ?? raw;
  const ccd = payload.courtCaseData ?? {};

  // Petitioners — webapi returns string arrays directly on courtCaseData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const petitioners: ECourtParty[] = (ccd.petitioners ?? []).map((name: any, i: number) => ({
    name: typeof name === "string" ? name : (name.name ?? ""),
    advocateName: (ccd.petitionerAdvocates ?? [])[i] ?? "",
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const respondents: ECourtParty[] = (ccd.respondents ?? []).map((name: any, i: number) => ({
    name: typeof name === "string" ? name : (name.name ?? ""),
    advocateName: (ccd.respondentAdvocates ?? [])[i] ?? "",
  }));

  // Hearing history — webapi uses historyOfCaseHearings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hearingHistory: ECourtHearing[] = (ccd.historyOfCaseHearings ?? ccd.hearingHistory ?? []).map((h: any) => ({
    businessDate: h.businessOnDate ?? h.businessDate ?? "",
    hearingDate: h.businessOnDate ?? h.hearingDate ?? "",
    purpose: h.purposeOfListing ?? h.purpose ?? "",
  }));

  // Orders — webapi uses judgmentOrders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders: ECourtOrder[] = (ccd.judgmentOrders ?? ccd.orders ?? []).map((o: any) => ({
    orderDate: o.orderDate ?? o.order_date ?? "",
    orderDetails: o.orderType ? `${o.orderType}${o.orderUrl ? ` — ${o.orderUrl}` : ""}` : (o.order_details ?? ""),
    orderLink: o.orderLink ?? o.orderUrl ?? o.order_link ?? o.order_url ?? undefined,
  }));

  // Acts — from caseTypeSub if present
  const acts: ECourtAct[] = ccd.caseTypeSub
    ? [{ act: ccd.caseTypeSub, sections: "" }]
    : [];

  // Judge — webapi puts array in judges[]
  const judgeFromArray = (ccd.judges ?? []).join(", ");
  const judge = judgeFromArray || (ccd.judge ?? "");

  return {
    cnrNumber: ccd.cnr ?? ccd.cnrNumber ?? cnr,
    caseType: ccd.caseTypeRaw ?? ccd.caseType ?? "",
    registrationNumber: ccd.registrationNumber ?? ccd.filingNumber ?? cnr,
    registrationDate: parseECourtDate(ccd.registrationDate ?? ccd.filingDate),
    filingDate: parseECourtDate(ccd.filingDate),
    caseStatus: ccd.caseStatus ?? "Pending",
    natureOfDisposal: ccd.disposalTypeRaw ?? ccd.disposalType ?? null,
    firstHearingDate: parseECourtDate(ccd.firstHearingDate),
    decisionDate: parseECourtDate(ccd.decisionDate),
    courtName: ccd.courtName ?? "",
    courtNumber: String(ccd.courtNo ?? ccd.courtCode ?? ""),
    judge,
    petitioners,
    respondents,
    acts,
    hearingHistory,
    nextHearingDate: parseECourtDate(ccd.nextHearingDate) ?? deriveNextHearingDate(hearingHistory),
    orders,
    _source: "api",
  };
}

// ─── Main fetch function ───────────────────────────────────────────────────────

async function fetchViaeCourtsindia(cnr: string): Promise<ECourtCase> {
  if (!API_KEY) {
    throw new ECourtAPIError(
      "ECOURTS_API_KEY is not configured. Get an API key from https://ecourtsindia.com",
      503
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}/case/${encodeURIComponent(cnr)}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (res.status === 404) {
      throw new ECourtAPIError(
        `Case not found for CNR: ${cnr}. Please verify the CNR number is correct.`,
        404
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new ECourtAPIError(
        "eCourts API authentication failed. Check your ECOURTS_API_KEY.",
        res.status
      );
    }

    if (res.status === 429) {
      throw new ECourtAPIError("eCourts API rate limit exceeded. Please try again shortly.", 429);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ECourtAPIError(`eCourts API error ${res.status}: ${body.slice(0, 200)}`, res.status);
    }

    const raw = await res.json();
    return normaliseResponse(raw, cnr);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ECourtAPIError("eCourts API request timed out. Please try again.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Fetch full case details by CNR number using ecourtsindia.com API.
 * CNR format: 16 alphanumeric characters, e.g. MHAU010012342023
 */
export async function getCaseByCNR(cnr: string): Promise<ECourtCase> {
  const normalised = cnr.toUpperCase().replace(/[\s\-_]/g, "");

  if (!/^[A-Z0-9]{16}$/.test(normalised)) {
    throw new ECourtAPIError(
      `Invalid CNR format: "${cnr}". Expected 16 characters like MHAU010012342023 (State+District+Type+Serial+Year).`,
      400
    );
  }

  return fetchViaeCourtsindia(normalised);
}

/**
 * Check if a CNR number appears to be valid format.
 */
export function isValidCNR(cnr: string): boolean {
  const n = cnr.toUpperCase().replace(/[\s\-_]/g, "");
  return /^[A-Z0-9]{16}$/.test(n);
}

/**
 * Get only the next hearing date for a CNR (lightweight).
 */
export async function getNextHearingDate(cnr: string): Promise<string | null> {
  const data = await getCaseByCNR(cnr);
  return data.nextHearingDate;
}

/**
 * Fetch an order/judgment PDF for a given CNR and order date.
 * Tries the direct orderLink first (if provided), then falls back
 * to the partner API endpoint pattern.
 * Returns the PDF as a Buffer, or null if unavailable.
 */
export async function getOrderDocument(
  cnr: string,
  orderDate: string,
  orderLink?: string
): Promise<Buffer | null> {
  if (!API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    // Try the direct link first if available
    const url = orderLink ?? `${BASE_URL}/case/${encodeURIComponent(cnr)}/order?date=${encodeURIComponent(orderDate)}`;

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanity check — reject tiny responses that are likely error pages
    if (buffer.length < 256) return null;

    return buffer;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Keep these exports for backward compatibility
export type { ECourtCase as ECourtsCase };
export { ECourtAPIError as ECourtsError };
