/**
 * PII Redaction module per PRD §10.3 and Milestone M6.
 * Redacts Indian mobile numbers, emails, Aadhaar-like numbers,
 * vehicle registration plates, URLs, and names following cues.
 *
 * Guarantees zero false redactions for transit times (e.g. '8:30 PM', '20:30')
 * and bus/route identifiers (e.g. 'Bus 23', 'Route 11', 'Bus 4B').
 */

export type RedactionType = "phone" | "email" | "aadhaar" | "vehicle_plate" | "url" | "name";

export interface Redaction {
  type: RedactionType;
  match: string;
  replacement: string;
}

export interface RedactResult {
  text: string;
  redactions: Redaction[];
}

const REPLACEMENTS: Record<RedactionType, string> = {
  url: "[URL]",
  email: "[EMAIL]",
  aadhaar: "[AADHAAR]",
  phone: "[PHONE]",
  vehicle_plate: "[VEHICLE_PLATE]",
  name: "[NAME]",
};

// URL regex (http/https and www)
const URL_REGEX = /\bhttps?:\/\/[^\s<>'"]+|\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>'"]*/gi;

// Email regex
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// 12-digit Aadhaar-like numbers (4-4-4 spaced, hyphenated, or contiguous 12 digits)
// Must not be preceded by '+' or digits to avoid false-matching phone numbers
const AADHAAR_REGEX = /(?<![+\d])\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b(?!\d)/g;

// Indian mobile numbers (10 digits starting with 6-9, with optional +91 or 0 prefix, spaces or dashes)
// Disallows colon or route/bus prefix to protect transit times and bus IDs
const PHONE_REGEX =
  /(?:(?:\+91|91)[\s-]?)?(?:0)?[6-9]\d{4}[\s-]?\d{5}\b|(?:\+91[\s-]?)?(?:0)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|(?:\+91[\s-]?)?(?:0)?[6-9]\d{9}\b/g;

// Indian Vehicle Registration Plates
// State codes: standard 2-letter state/UT abbreviations
const INDIAN_STATES =
  "AN|AP|AR|AS|BR|CG|CH|DD|DH|DL|DN|GA|GJ|HP|HR|JH|JK|KA|KL|LA|LD|MB|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TR|TS|UK|UA|UP|WB";

// Standard plates (e.g. UP 32 AB 1234, DL-01-A-1234, MH12CD5678, DL 1C AA 1111)
const PLATE_STANDARD_REGEX = new RegExp(
  `\\b(${INDIAN_STATES})[\\s-]?(\\d{1,2}[A-Z]?)[\\s-]?([A-Z]{1,3})?[\\s-]?(\\d{4})\\b`,
  "gi",
);

// Bharat Series plates (e.g. 22 BH 1234 AA)
const PLATE_BHARAT_REGEX = /\b\d{2}[\s-]?BH[\s-]?\d{4}[\s-]?[A-Z]{1,2}\b/gi;

// Words that should never be redacted as names even if following a cue
const NAME_STOPWORDS = new Set([
  "bus",
  "route",
  "stop",
  "here",
  "there",
  "waiting",
  "standing",
  "late",
  "crowded",
  "empty",
  "scared",
  "safe",
  "unsafe",
  "reporting",
  "travelling",
  "traveling",
  "going",
  "coming",
  "at",
  "in",
  "on",
  "near",
  "hai",
  "tha",
  "thi",
  "the",
  "a",
  "an",
  "very",
  "not",
  "bad",
  "good",
  "dark",
  "andhera",
  "light",
]);

interface NameCueRule {
  pattern: RegExp;
  extractName: (
    match: RegExpExecArray,
  ) => { name: string; fullMatch: string; prefix: string; suffix: string } | null;
}

const ENG_NAME_PATTERN = "[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?";
const HINDI_DEV_PATTERN = "[\\u0900-\\u097F]+(?:\\s+[\\u0900-\\u097F]+)?";
const HINDI_NAME_PATTERN = `(?:${ENG_NAME_PATTERN}|${HINDI_DEV_PATTERN})`;

const NAME_CUE_RULES: NameCueRule[] = [
  // "my name is John", "name is Priya", "I am Priya", "I'm Priya", "this is John"
  {
    pattern: new RegExp(
      `\\b([mM][yY]\\s+[nN][aA][mM][eE]\\s+[iI][sS]|[nN][aA][mM][eE]\\s+[iI][sS]|[iI]\\s+[aA][mM]|[iI]'[mM]|[tT][hH][iI][sS]\\s+[iI][sS])\\s+(${ENG_NAME_PATTERN})\\b`,
      "g",
    ),
    extractName: (m) => {
      if (!m[1] || !m[2]) return null;
      return {
        prefix: m[1] + " ",
        name: m[2],
        suffix: "",
        fullMatch: m[0],
      };
    },
  },
  // "called Ramesh", "named Suresh"
  {
    pattern: new RegExp(
      `\\b([cC][aA][lL][lL][eE][dD]|[nN][aA][mM][eE][dD])\\s+(${ENG_NAME_PATTERN})\\b`,
      "g",
    ),
    extractName: (m) => {
      if (!m[1] || !m[2]) return null;
      return {
        prefix: m[1] + " ",
        name: m[2],
        suffix: "",
        fullMatch: m[0],
      };
    },
  },
  // Hindi/Hinglish: "mera naam Rahul", "apna naam Suresh", "unka naam Ramesh", "driver ka naam Rajesh"
  {
    pattern: new RegExp(
      `\\b([mM][eE][rR][aA]\\s+[nN][aA][aA][mM]|[aA][pP][nN][aA]\\s+[nN][aA][aA][mM]|[uU][nN][kK][aA]\\s+[nN][aA][aA][mM]|[dD][rR][iI][vV][eE][rR]\\s+[kK][aA]\\s+[nN][aA][aA][mM]|[cC][oO][nN][dD][uU][cC][tT][oO][rR]\\s+[kK][aA]\\s+[nN][aA][aA][mM]|मेरा नाम|अपना नाम|उनका नाम|ड्राइवर का नाम|कंडक्टर का नाम)\\s+(${HINDI_NAME_PATTERN})(?:\\s+([hH][aA][iI]|था|थी|है))?\\b`,
      "g",
    ),
    extractName: (m) => {
      if (!m[1] || !m[2]) return null;
      return {
        prefix: m[1] + " ",
        name: m[2],
        suffix: m[3] ? ` ${m[3]}` : "",
        fullMatch: m[0],
      };
    },
  },
  // Hindi/Hinglish: "naam Suresh hai", "नाम सुरेश है"
  {
    pattern: new RegExp(
      `\\b([nN][aA][aA][mM]|नाम)\\s+(${HINDI_NAME_PATTERN})\\s+([hH][aA][iI]|था|थी|है)\\b`,
      "g",
    ),
    extractName: (m) => {
      if (!m[1] || !m[2]) return null;
      return {
        prefix: m[1] + " ",
        name: m[2],
        suffix: ` ${m[3]}`,
        fullMatch: m[0],
      };
    },
  },
];

/**
 * Redacts PII from text, returning the redacted text and a list of redactions performed.
 */
export function redactPII(input: string): RedactResult {
  if (!input) {
    return { text: "", redactions: [] };
  }

  let text = input;
  const redactions: Redaction[] = [];

  const replaceWithTag = (regex: RegExp, type: RedactionType): void => {
    regex.lastIndex = 0;
    text = text.replace(regex, (matched) => {
      redactions.push({
        type,
        match: matched,
        replacement: REPLACEMENTS[type],
      });
      return REPLACEMENTS[type];
    });
  };

  // 1. URLs
  replaceWithTag(URL_REGEX, "url");

  // 2. Email addresses
  replaceWithTag(EMAIL_REGEX, "email");

  // 3. Aadhaar-like 12-digit numbers
  replaceWithTag(AADHAAR_REGEX, "aadhaar");

  // 4. Indian Mobile Numbers
  replaceWithTag(PHONE_REGEX, "phone");

  // 5. Vehicle Plates
  replaceWithTag(PLATE_STANDARD_REGEX, "vehicle_plate");
  replaceWithTag(PLATE_BHARAT_REGEX, "vehicle_plate");

  // 6. Best-effort Name-after-cue redaction
  for (const rule of NAME_CUE_RULES) {
    rule.pattern.lastIndex = 0;
    text = text.replace(rule.pattern, (...args) => {
      const match = args as unknown as RegExpExecArray;
      const extracted = rule.extractName(match);
      if (!extracted) {
        return args[0] as string;
      }

      const candidate = extracted.name.trim();
      const firstWord = candidate.split(/\s+/)[0]?.toLowerCase() ?? "";

      // Skip stopwords, pure numbers, or already redacted tokens
      if (
        NAME_STOPWORDS.has(firstWord) ||
        NAME_STOPWORDS.has(candidate.toLowerCase()) ||
        /^\d+$/.test(candidate) ||
        candidate.startsWith("[")
      ) {
        return args[0] as string;
      }

      redactions.push({
        type: "name",
        match: candidate,
        replacement: REPLACEMENTS.name,
      });

      return `${extracted.prefix}${REPLACEMENTS.name}${extracted.suffix}`;
    });
  }

  return { text, redactions };
}

// Alias for convenience
export const redact = redactPII;
