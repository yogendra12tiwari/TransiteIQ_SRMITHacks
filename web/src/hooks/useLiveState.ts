import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { SimLive } from "@transitiq/shared";

export interface LiveStateResult {
  data: SimLive | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  lastUpdatedMs: number | null;
}

const STALE_THRESHOLD_MS = 8000; // 8 seconds without snapshot = stale

export function useLiveState(): LiveStateResult {
  const [data, setData] = useState<SimLive | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        doc(db, "sim", "live"),
        (snapshot) => {
          if (!snapshot.exists()) {
            setLoading(false);
            setIsStale(true);
            return;
          }

          try {
            const raw = snapshot.data();
            const parsed = SimLive.parse(raw);
            setData(parsed);
            const now = Date.now();
            setLastUpdatedMs(now);
            setIsStale(false);
            setError(null);
          } catch (err) {
            console.warn("Invalid sim/live snapshot payload:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.warn("Firestore onSnapshot error on sim/live:", err);
          setError(err);
          setLoading(false);
        },
      );
    } catch (err) {
      console.warn("Failed to subscribe to sim/live:", err);
      setLoading(false);
    }

    return () => unsub?.();
  }, []);

  // Timer to detect stale data when snapshots cease (M2-24: 8s threshold)
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdatedMs !== null) {
        const elapsed = Date.now() - lastUpdatedMs;
        if (elapsed > STALE_THRESHOLD_MS) {
          setIsStale(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdatedMs]);

  return { data, loading, error, isStale, lastUpdatedMs };
}
