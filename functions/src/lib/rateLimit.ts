import crypto from "node:crypto";

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

// In-memory fallback tracking for emulator and Spark environments
const inMemoryCounts = new Map<string, { count: number; hourBucket: number }>();

/**
 * Checks per-user rate limit (default 10 requests per hour).
 * Uses sha256(uid + action + hourBucket) to preserve privacy (Decision D6).
 */
export function checkRateLimit(
  uid: string,
  action: string,
  maxPerHour = 10,
  nowMs = Date.now(),
): RateLimitCheckResult {
  const currentHourBucket = Math.floor(nowMs / (60 * 60 * 1000));
  const hashKey = crypto.createHash("sha256").update(`${uid}:${action}:${currentHourBucket}`).digest("hex");

  const entry = inMemoryCounts.get(hashKey);

  if (!entry || entry.hourBucket !== currentHourBucket) {
    inMemoryCounts.set(hashKey, { count: 1, hourBucket: currentHourBucket });
    return {
      allowed: true,
      remaining: maxPerHour - 1,
      resetMs: (currentHourBucket + 1) * 3600000,
    };
  }

  if (entry.count >= maxPerHour) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: (currentHourBucket + 1) * 3600000,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxPerHour - entry.count,
    resetMs: (currentHourBucket + 1) * 3600000,
  };
}

export function clearRateLimitsForTesting(): void {
  inMemoryCounts.clear();
}
