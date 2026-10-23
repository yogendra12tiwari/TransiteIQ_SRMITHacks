import crypto from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { ReportInput, redactPII, scanInjection, type ReportCategory } from "@transitiq/shared";
import { checkRateLimit } from "../lib/rateLimit.js";

// Duplicate dampening cache per M6-10: 24-hour window
const recentSubmissions = new Map<string, number>();

export interface SubmitReportResult {
  reportId: string;
  status: "created" | "duplicate_dampened";
  needsHumanReview: boolean;
  severity: "low" | "medium" | "high";
  textRedacted?: string;
  injectionFlag: boolean;
}

const HARASSMENT_KEYWORDS = /harass|stalk|threat|abuse|follow|छेड़छाड़|पीछा|धमकी|बदतमीज़ी/i;
const KNOWN_STOPS = new Set([
  "stop_A",
  "stop_B",
  "stop_C",
  "stop_D",
  "stop_alambagh",
  "stop_charbagh",
  "stop_aminabad",
  "stop_hazratganj",
  "stop_lohia",
  "stop_patrakarpuram",
  "stop_gomtinagar",
  "stop_vibhuti",
  "stop_naka",
  "stop_chowk",
  "stop_munshipulia",
  "stop_indiranagar",
  "stop_polytechnic",
]);

export async function submitReportHandler(
  input: unknown,
  authUid?: string,
  nowMs = Date.now(),
  writer?: (col: string, id: string, data: Record<string, unknown>) => Promise<void>,
): Promise<SubmitReportResult> {
  // Anonymous or authenticated auth required (M6-09)
  if (!authUid) {
    throw new HttpsError("unauthenticated", "Authentication required to submit report");
  }

  // Rate limit: 5 per hour per user (M6-09)
  const rateLimit = checkRateLimit(authUid, "submitReport", 5, nowMs);
  if (!rateLimit.allowed) {
    throw new HttpsError("resource-exhausted", "Rate limit of 5 reports per hour exceeded");
  }

  // Zod validate ReportInput
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const { stopId, category, text = "" } = parsed.data;

  // Unknown stop validation (M6-12)
  if (!KNOWN_STOPS.has(stopId) && !stopId.startsWith("stop_")) {
    throw new HttpsError("not-found", `Unknown stopId: ${stopId}`);
  }

  // PII Redaction (M6-01, M6-02)
  const { text: textRedacted } = redactPII(text);

  // Prompt injection detection (M6-03)
  const injection = scanInjection(text);

  // Duplicate dampening per M6-10: same hashed user + normalized text within 24 hours
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
  const userTextHash = crypto
    .createHash("sha256")
    .update(`${authUid}:${stopId}:${category}:${normalizedText}`)
    .digest("hex");

  const lastSeen = recentSubmissions.get(userTextHash);
  const isDuplicate = lastSeen !== undefined && nowMs - lastSeen < 24 * 3600 * 1000;
  recentSubmissions.set(userTextHash, nowMs);

  // Deterministic triage (M6-11)
  let severity: "low" | "medium" | "high" = "low";
  let needsHumanReview = false;

  if (category === "harassment_concern" || HARASSMENT_KEYWORDS.test(text)) {
    severity = "high";
    needsHumanReview = true;
  } else if (category === "poor_lighting" || category === "long_wait") {
    severity = "medium";
  } else if (category === "skipped_bus" || category === "overcrowding") {
    severity = "low";
  }

  const reportId = "rep_" + crypto.randomBytes(8).toString("hex");
  const clusterId = `cluster_${stopId}_${category}`;

  const reportDoc = {
    id: reportId,
    stopId,
    category: category as ReportCategory,
    textRedacted: textRedacted ? textRedacted : undefined,
    severity,
    clusterId,
    needsHumanReview,
    injectionFlag: injection.hasInjection,
    triage: {
      source: "rules" as const,
      promptVersion: "triageReport.v1.md",
    },
    createdAt: nowMs,
  };

  if (writer) {
    // Write report
    await writer("reports", reportId, reportDoc);

    // If harassment, write to reviewQueue (M6-09)
    if (needsHumanReview || category === "harassment_concern") {
      await writer("reviewQueue", reportId, {
        id: reportId,
        reportId,
        stopId,
        category,
        textRedacted: textRedacted || "",
        status: "new",
        reviewerNotes: "",
        createdAt: nowMs,
      });
    }
  }

  return {
    reportId,
    status: isDuplicate ? "duplicate_dampened" : "created",
    needsHumanReview,
    severity,
    textRedacted: textRedacted || undefined,
    injectionFlag: injection.hasInjection,
  };
}
