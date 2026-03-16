/**
 * eCourts India — Case Lookup Engine
 *
 * Strategy (in priority order):
 *  1. NIC Official REST API  (api.ecourts.gov.in) — only works if key is valid & IP whitelisted
 *  2. eCourts Web Scraper    (services.ecourts.gov.in/ecourtindia_v6) — works from any IP
 *  3. Graceful error with actionable message
 *
 * The official REST API (`api.ecourts.gov.in`) is restricted to whitelisted IPs
 * issued by NIC on a per-application basis. Keys of the form "eci_live_*" are
 * only valid from whitelisted IPs. From non-whitelisted servers the API simply
 * times out (no response at all) — this is the expected behaviour.
 *
 * The web-scraper approach reverse-engineers the same AJAX endpoints used by
 * the eCourts Android/iOS app and browser, which are publicly accessible.
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
  /** Which method successfully fetched this data */
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
const TIMEOUT = 12_000;

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

// ─── Method 1: Official NIC REST API ─────────────────────────────────────────

async function fetchViaAPI(cnr: string): Promise<ECourtCase> {
  if (!API_KEY) throw new ECourtAPIError("No API key configured", 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(`https://api.ecourts.gov.in/api/case/cnr/${cnr}`, {
      signal: controller.signal,
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ECourtAPIError(`API HTTP ${res.status}: ${body.slice(0, 200)}`, res.status);
    }
    const raw = await res.json();
    if (raw.error) throw new ECourtAPIError(raw.error, 400);
    return normaliseAPIResponse(raw, cnr);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ECourtAPIError(`API timed out (IP may not be whitelisted by NIC)`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normaliseAPIResponse(raw: Record<string, unknown>, cnr: string): ECourtCase {
  const d = (raw.case_details ?? {}) as Record<string, string>;
  const hearingHistory: ECourtHearing[] = ((raw.hearing_dates ?? []) as Record<string, string>[]).map(h => ({
    businessDate: h.business_on_date ?? "",
    hearingDate: h.hearing_date ?? "",
    purpose: h.purpose_of_hearing ?? "",
  }));
  return {
    cnrNumber: d.cnr_number ?? cnr,
    caseType: d.case_type ?? "",
    registrationNumber: d.reg_no ?? "",
    registrationDate: parseECourtDate(d.reg_date),
    filingDate: parseECourtDate(d.filing_date),
    caseStatus: d.case_status ?? "",
    natureOfDisposal: d.nature_of_disposal?.trim() || null,
    firstHearingDate: parseECourtDate(d.first_hearing_date),
    decisionDate: parseECourtDate(d.decision_date),
    courtName: d.court_name ?? "",
    courtNumber: d.court_no ?? "",
    judge: d.judge ?? "",
    petitioners: ((raw.petitioner ?? []) as Record<string, string>[]).map(p => ({
      name: p.petitioner_name ?? "",
      advocateName: p.advocate_name ?? "",
    })),
    respondents: ((raw.respondent ?? []) as Record<string, string>[]).map(r => ({
      name: r.respondent_name ?? "",
      advocateName: r.advocate_name ?? "",
    })),
    acts: ((raw.acts ?? []) as Record<string, string>[]).map(a => ({
      act: a.act ?? "",
      sections: a.sections ?? "",
    })),
    hearingHistory,
    nextHearingDate: deriveNextHearingDate(hearingHistory),
    orders: ((raw.orders ?? []) as Record<string, string>[]).map(o => ({
      orderDate: o.order_date ?? "",
      orderDetails: o.order_details ?? "",
    })),
    _source: "api",
  };
}

// ─── Method 2: Web Scraper (services.ecourts.gov.in) ─────────────────────────

const WEB_BASE = "https://services.ecourts.gov.in/ecourtindia_v6";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36";

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ECourtAPIError(`Web request timed out: ${url}`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Acquire a session cookie from the eCourts portal */
async function getSession(): Promise<string> {
  const res = await fetchWithTimeout(`${WEB_BASE}/`, {
    headers: {
      "User-Agent": MOBILE_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  const cookies = res.headers.get("set-cookie") ?? "";
  // Extract PHPSESSID or JSESSIONID
  const match = cookies.match(/(?:PHPSESSID|JSESSIONID|ci_session)=([^;,\s]+)/i);
  if (!match) {
    // Some responses embed session in multiple set-cookie lines
    return "";
  }
  return `${match[0].split("=")[0]}=${match[1]}`;
}

/** Parse the HTML table-based case status response from eCourts */
function parseWebResponse(html: string, cnr: string): ECourtCase {
  // eCourts returns JSON or HTML depending on appFlag
  // Try JSON first
  try {
    const json = JSON.parse(html);
    if (json.case_details || json.data) {
      return normaliseAPIResponse(json.data ?? json, cnr);
    }
  } catch {
    // Not JSON — parse HTML
  }

  if (html.includes("Record Not Found") || html.includes("No records found") || html.trim() === "Invalid Parameter") {
    throw new ECourtAPIError(`Case not found for CNR: ${cnr}. Verify the CNR number is correct.`, 404);
  }

  // Parse HTML table response
  const extract = (pattern: RegExp): string => (html.match(pattern)?.[1] ?? "").trim().replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");

  // Case details from the standard eCourts HTML table
  const caseType = extract(/Case Type[^:]*:\s*<[^>]+>([^<]+)/i) ||
    extract(/<td[^>]*>\s*Case Type\s*<\/td>\s*<td[^>]*>([^<]+)/i);

  const regNo = extract(/Registration Number[^:]*:\s*<[^>]+>([^<]+)/i) ||
    extract(/CNR Number[^:]*:\s*<[^>]+>([^<]+)/i);

  const filingDate = extract(/Filing Date[^:]*:\s*<[^>]+>([^<]+)/i) ||
    extract(/Date of Filing[^:]*:\s*<[^>]+>([^<]+)/i);

  const regDate = extract(/Registration Date[^:]*:\s*<[^>]+>([^<]+)/i);
  const caseStatus = extract(/Case Status[^:]*:\s*<[^>]+>([^<]+)/i) ||
    extract(/Status[^:]*:\s*<[^>]+>([^<]+)/i) || "Pending";

  const judge = extract(/Before[^:]*:\s*<[^>]+>([^<]+)/i) ||
    extract(/Judge[^:]*:\s*<[^>]+>([^<]+)/i);

  const courtName = extract(/Court[^:]*:\s*<[^>]+>([^<]+)/i) ||
    extract(/<td[^>]*>Court Name\s*<\/td>\s*<td[^>]*>([^<]+)/i);

  // Parse petitioner and respondent
  const petitionerMatch = html.match(/Petitioner[^<]*<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
  const respondentMatch = html.match(/Respondent[^<]*<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);

  const cleanParty = (raw: string): ECourtParty[] => {
    if (!raw) return [];
    return raw.split(/<br\s*\/?>/i)
      .map(s => s.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .map(name => ({ name, advocateName: "" }));
  };

  // Parse hearing history
  const hearingHistory: ECourtHearing[] = [];
  const hearingPattern = /<tr[^>]*>\s*<td[^>]*>(\d{2}-\d{2}-\d{4})<\/td>\s*<td[^>]*>(\d{2}-\d{2}-\d{4})<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
  let hMatch;
  while ((hMatch = hearingPattern.exec(html)) !== null) {
    hearingHistory.push({
      businessDate: hMatch[1],
      hearingDate: hMatch[2],
      purpose: hMatch[3].trim(),
    });
  }

  return {
    cnrNumber: cnr,
    caseType: caseType || "Unknown",
    registrationNumber: regNo || cnr,
    registrationDate: parseECourtDate(regDate),
    filingDate: parseECourtDate(filingDate),
    caseStatus: caseStatus || "Pending",
    natureOfDisposal: null,
    firstHearingDate: hearingHistory.length ? parseECourtDate(hearingHistory[0].hearingDate) : null,
    decisionDate: null,
    courtName: courtName || "",
    courtNumber: "",
    judge: judge || "",
    petitioners: cleanParty(petitionerMatch?.[1] ?? ""),
    respondents: cleanParty(respondentMatch?.[1] ?? ""),
    acts: [],
    hearingHistory,
    nextHearingDate: deriveNextHearingDate(hearingHistory),
    orders: [],
    _source: "web",
  };
}

async function fetchViaWeb(cnr: string): Promise<ECourtCase> {
  // Get a fresh session
  let cookie = "";
  try {
    cookie = await getSession();
  } catch {
    // Proceed without session — some endpoints don't require it
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json, text/javascript, */*",
    "User-Agent": MOBILE_UA,
    "Origin": "https://services.ecourts.gov.in",
    "Referer": `${WEB_BASE}/`,
  };
  if (cookie) headers["Cookie"] = cookie;

  // Try multiple endpoint variants
  const endpoints = [
    { url: `${WEB_BASE}/cases/case_no_cnr`, body: `cino=${cnr}&apptoken=null&appFlag=` },
    { url: `${WEB_BASE}/cases/case_no_cnr`, body: `cino=${cnr}&appFlag=web` },
    { url: `${WEB_BASE}/?p=casestatus/index&cino=${cnr}`, body: null },
  ];

  const errors: string[] = [];

  for (const ep of endpoints) {
    try {
      const res = await fetchWithTimeout(ep.url, {
        method: ep.body ? "POST" : "GET",
        headers,
        body: ep.body ?? undefined,
        redirect: "follow",
      });

      const text = await res.text();

      if (text.includes("Invalid Parameter") || text.includes("captcha") || text.includes("CAPTCHA")) {
        errors.push(`${ep.url}: requires CAPTCHA or session token`);
        continue;
      }

      if (text.includes("Record Not Found") || text.includes("No records found")) {
        throw new ECourtAPIError(`Case not found for CNR "${cnr}". Please verify the CNR number.`, 404);
      }

      if (text.length < 50) {
        errors.push(`${ep.url}: empty/short response (${text.length} chars)`);
        continue;
      }

      return parseWebResponse(text, cnr);
    } catch (err) {
      if (err instanceof ECourtAPIError) throw err;
      errors.push(`${ep.url}: ${(err as Error).message}`);
    }
  }

  throw new ECourtAPIError(
    `eCourts web lookup failed — the portal requires CAPTCHA verification which cannot be automated.\n${errors.join("\n")}`,
    503
  );
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Fetch full case details by CNR number.
 *
 * Tries the official NIC REST API first (if key is configured and IP is whitelisted),
 * then falls back to the eCourts web scraper.
 *
 * CNR format: 16 alphanumeric characters, e.g. MHAU010012342023
 *   <State(2)><District(2)><CaseType(4)><Serial(6)><Year(4)> — see eCourts portal
 */
export async function getCaseByCNR(cnr: string): Promise<ECourtCase> {
  const normalised = cnr.toUpperCase().replace(/[\s\-_]/g, "");

  if (!/^[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{4}\d{6}\d{4}$/.test(normalised) &&
      !/^[A-Z0-9]{16}$/.test(normalised)) {
    throw new ECourtAPIError(
      `Invalid CNR format: "${cnr}". Expected 16 characters like MHAU010012342023 (State+District+Type+Serial+Year).`,
      400
    );
  }

  // Method 1: Official NIC API (works only if IP is whitelisted by NIC)
  if (API_KEY) {
    try {
      return await fetchViaAPI(normalised);
    } catch (err) {
      const msg = (err as Error).message;
      // If timed out, the IP isn't whitelisted — fall through silently
      if (!msg.includes("timed out") && !msg.includes("408") && !msg.includes("fetch failed")) {
        // A real error (4xx etc) — re-throw
        throw err;
      }
      console.log(`[eCourts] Official API unavailable (${msg}), trying web scraper...`);
    }
  }

  // Method 2: Web scraper
  return fetchViaWeb(normalised);
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

// Keep these exports for backward compatibility with sync routes
export type { ECourtCase as ECourtsCase };
export { ECourtAPIError as ECourtsError };
