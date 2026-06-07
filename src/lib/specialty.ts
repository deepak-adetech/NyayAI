// Canonical legal specialties used across the lawyer directory + matching.
export const SPECIALTIES: { code: string; label: string }[] = [
  { code: "CRIMINAL", label: "Criminal" },
  { code: "FAMILY", label: "Family & Divorce" },
  { code: "PROPERTY", label: "Property & Real Estate" },
  { code: "CONSUMER", label: "Consumer" },
  { code: "LABOUR", label: "Labour & Employment" },
  { code: "CORPORATE", label: "Corporate & Contracts" },
  { code: "TAX", label: "Tax & GST" },
  { code: "CONSTITUTIONAL", label: "Constitutional & Writs" },
  { code: "CYBER", label: "Cyber & IT" },
  { code: "IP", label: "Intellectual Property" },
  { code: "MOTOR_ACCIDENT", label: "Motor Accident" },
  { code: "IMMIGRATION", label: "Immigration" },
  { code: "OTHER", label: "General" },
];

export const SPECIALTY_LABELS: Record<string, string> = Object.fromEntries(
  SPECIALTIES.map((s) => [s.code, s.label])
);

export function specialtyLabel(code?: string | null): string {
  if (!code) return "General";
  return SPECIALTY_LABELS[code] ?? "General";
}

// Keyword map (English + common Hindi/Devanagari terms) for lightweight,
// fast, deterministic classification of a free-text legal question.
const KEYWORDS: Record<string, string[]> = {
  CRIMINAL: [
    "theft", "murder", "fir", "bail", "arrest", "ipc", "bns", "assault", "fraud",
    "cheating", "police", "criminal", "crime", "dowry", "498a", "ndps", "pocso",
    "accused", "charge sheet", "chargesheet", "rape", "kidnap", "bns 2023", "custody battle",
    "चोरी", "हत्या", "जमानत", "गिरफ्तार", "पुलिस", "अपराध", "धोखा", "एफआईआर",
  ],
  FAMILY: [
    "divorce", "marriage", "custody", "maintenance", "alimony", "adoption",
    "domestic violence", "husband", "wife", "guardianship", "hindu marriage",
    "judicial separation", "khula", "talaq", "child support",
    "तलाक", "शादी", "विवाह", "गुजारा", "दहेज", "पत्नी", "पति",
  ],
  PROPERTY: [
    "property", "land", "tenant", "landlord", "rent", "lease", "sale deed",
    "registry", "partition", "inheritance", "will", "possession", "eviction",
    "real estate", "mutation", "encroachment", "builder",
    "संपत्ति", "जमीन", "किराया", "मकान", "वसीयत", "कब्जा", "किरायेदार",
  ],
  CONSUMER: [
    "consumer", "defective", "refund", "warranty", "e-commerce", "ecommerce",
    "service deficiency", "product", "online order", "delivery", "amazon", "flipkart",
    "उपभोक्ता", "रिफंड", "वारंटी",
  ],
  LABOUR: [
    "salary", "employer", "employee", "termination", "dismissal", "pf",
    "provident fund", "gratuity", "workplace", "labour", "wages", "industrial dispute",
    "notice period", "resignation", "layoff", "esi",
    "वेतन", "नौकरी", "तनख्वाह", "नियोक्ता",
  ],
  CORPORATE: [
    "company", "startup", "shares", "director", "compliance", "contract",
    "agreement", "business", "partnership", "msme", "shareholder", "incorporation",
    "llp", "memorandum", "nda",
    "कंपनी", "अनुबंध", "व्यापार",
  ],
  TAX: [
    "income tax", "gst", "tax", "assessment", "tds", "tax notice", "itr",
    "tax refund", "gst registration",
    "कर", "टैक्स", "जीएसटी",
  ],
  CONSTITUTIONAL: [
    "fundamental right", "writ", "pil", "article", "constitution", "habeas corpus",
    "mandamus", "certiorari", "quo warranto",
    "मौलिक अधिकार", "रिट", "संविधान",
  ],
  CYBER: [
    "cyber", "online fraud", "hacking", "phishing", "it act", "data breach",
    "social media", "online defamation", "otp fraud", "upi fraud", "deepfake",
    "साइबर", "ऑनलाइन धोखा",
  ],
  IP: [
    "trademark", "copyright", "patent", "infringement", "design registration",
    "brand name", "logo", "piracy",
    "ट्रेडमार्क", "कॉपीराइट", "पेटेंट",
  ],
  MOTOR_ACCIDENT: [
    "accident", "motor", "vehicle", "insurance claim", "compensation", "mact",
    "road accident", "hit and run", "third party claim",
    "दुर्घटना", "मुआवजा", "बीमा",
  ],
  IMMIGRATION: [
    "visa", "passport", "citizenship", "immigration", "foreigner", "oci", "pio",
    "deportation", "work permit",
    "वीजा", "पासपोर्ट", "नागरिकता",
  ],
};

/**
 * Determine the most relevant legal specialty for a free-text question.
 * Deterministic keyword scoring (fast, no model call). Falls back to "OTHER".
 */
export function classifySpecialty(question: string): string {
  const q = question.toLowerCase();
  let best = "OTHER";
  let bestScore = 0;

  for (const [code, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      if (q.includes(w.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return best;
}
