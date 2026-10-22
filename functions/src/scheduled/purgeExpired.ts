export interface PurgeExpiredResult {
  purgedTripsCount: number;
  timestamp: number;
}

/**
 * Pure handler for purging expired trips and rate limit buckets (M5-22).
 */
export async function purgeExpiredHandler(
  nowMs = Date.now(),
  deleter?: (beforeMs: number) => Promise<number>,
): Promise<PurgeExpiredResult> {
  let count = 0;
  if (deleter) {
    count = await deleter(nowMs);
  }
  return {
    purgedTripsCount: count,
    timestamp: nowMs,
  };
}
