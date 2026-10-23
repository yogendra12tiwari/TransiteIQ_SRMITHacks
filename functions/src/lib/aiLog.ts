import crypto from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { GuardFlags } from "@transitiq/shared";

export interface LogAiEventParams {
  flow: string;
  promptVersion?: string | null;
  model?: string;
  source: "genkit" | "rules";
  inputHash?: string;
  rawInputToHash?: unknown;
  guardFlags?: Partial<GuardFlags>;
  latencyMs: number;
  outcome: "ok" | "fallback" | "blocked";
  createdAt?: number;
  expiresAtTs?: number | Timestamp | unknown;
  db?: Firestore;
}

export interface AiLogRecord {
  id: string;
  flow: string;
  promptVersion: string | null;
  model: string;
  source: "genkit" | "rules";
  inputHash: string;
  guardFlags: {
    piiRedacted: boolean;
    injectionFlag: boolean;
    bannedPhraseBlocked: boolean;
  };
  guard: {
    piiRedacted: boolean;
    injectionFlag: boolean;
    bannedPhraseBlocked: boolean;
  };
  latencyMs: number;
  outcome: "ok" | "fallback" | "blocked";
  createdAt: number;
  expiresAtTs: unknown;
}

// In-memory buffer for testing and verification
export const inMemoryAiLogs: AiLogRecord[] = [];

/**
 * Computes SHA-256 hash of any input (string or JSON-serializable structure).
 * Never stores or retains raw user text.
 */
export function hashInput(input: unknown): string {
  if (typeof input === "string") {
    return crypto.createHash("sha256").update(input).digest("hex");
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input ?? ""))
    .digest("hex");
}

function getSafeFirestore(customDb?: Firestore) {
  if (customDb) return customDb;
  // If running in test environment without emulator, avoid hanging remote connections
  if ((process.env.NODE_ENV === "test" || process.env.VITEST) && !process.env.FIRESTORE_EMULATOR_HOST) {
    return null;
  }
  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    return getFirestore();
  } catch {
    return null;
  }
}

/**
 * Writes privacy-preserving log entry to logs/{id}.
 * Strictly ensures raw input text is never persisted.
 */
export async function logAiEvent(params: LogAiEventParams): Promise<AiLogRecord> {
  const now = params.createdAt ?? Date.now();
  // PRD §11: 30-day retention
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expiresMs = now + thirtyDaysMs;

  const inputHash =
    params.inputHash ??
    (params.rawInputToHash !== undefined ? hashInput(params.rawInputToHash) : hashInput(""));

  const guardFlags = {
    piiRedacted: Boolean(params.guardFlags?.piiRedacted),
    injectionFlag: Boolean(params.guardFlags?.injectionFlag),
    bannedPhraseBlocked: Boolean(params.guardFlags?.bannedPhraseBlocked),
  };

  const id = crypto.randomUUID();

  // Firestore Timestamp or millis
  let expiresAtTs = params.expiresAtTs;
  if (!expiresAtTs) {
    try {
      expiresAtTs = Timestamp.fromMillis(expiresMs);
    } catch {
      expiresAtTs = expiresMs;
    }
  }

  const record: AiLogRecord = {
    id,
    flow: params.flow,
    promptVersion: params.promptVersion ?? null,
    model: params.model ?? (params.source === "genkit" ? "gemini-2.5-flash" : "rules-engine"),
    source: params.source,
    inputHash,
    guardFlags,
    guard: guardFlags,
    latencyMs: Math.max(0, Math.round(params.latencyMs)),
    outcome: params.outcome,
    createdAt: now,
    expiresAtTs,
  };

  inMemoryAiLogs.push(record);

  // Firestore write if available
  const db = getSafeFirestore(params.db);
  if (db && typeof db.collection === "function") {
    try {
      await Promise.race([
        db.collection("logs").doc(id).set(record),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 1000)),
      ]);
    } catch {
      // In tests or mock environments without Firestore connection, continue without throwing
    }
  }

  return record;
}

export function clearAiLogsForTesting(): void {
  inMemoryAiLogs.length = 0;
}
