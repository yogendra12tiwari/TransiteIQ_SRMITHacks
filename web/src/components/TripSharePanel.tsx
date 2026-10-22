import { useState } from "react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { computeTripExpiry, type TripState } from "@transitiq/shared";

interface TripSharePanelProps {
  routeId: string;
  busId?: string | null;
  boardingStopId: string;
  destinationStopId: string;
  tripState?: TripState;
  onTripCreated?: (token: string) => void;
  lang?: "en" | "hi";
}

export function TripSharePanel({
  routeId,
  busId = null,
  boardingStopId,
  destinationStopId,
  onTripCreated,
  lang = "en",
}: TripSharePanelProps) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("transitiq_active_trip_token");
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getFullShareUrl = (tok: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/trip/${tok}`;
    }
    return `https://transiteiq.web.app/trip/${tok}`;
  };

  const handleCreateShare = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate 128-bit cryptographically secure random token (32 hex characters)
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const generatedToken = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const nowMs = Date.now();
      const expiresAt = computeTripExpiry(nowMs, 60);

      const tripDoc = {
        token: generatedToken,
        routeId,
        busId: busId ?? null,
        boardingStopId,
        destinationStopId,
        state: "PLANNED",
        createdAt: nowMs,
        expiresAt,
      };

      // Write to Firestore trips collection (supported by rules M5-25)
      await setDoc(doc(db, "trips", generatedToken), tripDoc);

      setToken(generatedToken);
      localStorage.setItem("transitiq_active_trip_token", generatedToken);
      if (onTripCreated) onTripCreated(generatedToken);
    } catch (err) {
      console.error("Failed to create trip share link:", err);
      setError(
        lang === "hi"
          ? "शेयर लिंक बनाने में विफल। कृपया पुनः प्रयास करें।"
          : "Failed to generate share link. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    const url = getFullShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const handleNativeShare = async () => {
    if (!token) return;
    const url = getFullShareUrl(token);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "TransitIQ Live Trip Tracking",
          text: "I am sharing my live bus trip with you on TransitIQ. Track my ride in real-time:",
          url,
        });
      } catch (e) {
        console.debug("Native share cancelled:", e);
      }
    } else {
      handleCopy();
    }
  };

  const handleStopSharing = async () => {
    if (!token) return;
    try {
      await updateDoc(doc(db, "trips", token), {
        state: "COMPLETED",
        expiresAt: Date.now(), // Instantly invalidates link
      });
    } catch (e) {
      console.warn("Could not mark trip completed in Firestore:", e);
    }
    setToken(null);
    localStorage.removeItem("transitiq_active_trip_token");
  };

  return (
    <div
      data-testid="trip-share-panel"
      className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            {lang === "hi" ? "भरोसेमंद संपर्कों के साथ ट्रिप शेयर करें" : "Share Trip With Trusted Contacts"}
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          {lang === "hi" ? "लॉगिन की आवश्यकता नहीं" : "No Login Required for Contact"}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          ⚠️ {error}
        </div>
      )}

      {!token ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            {lang === "hi"
              ? "एक सुरक्षित, 2 घंटे में स्वतः समाप्त होने वाला लिंक बनाएं। आपके परिजन बिना किसी ऐप को डाउनलोड किए आपकी बस की लाइव लोकेशन देख सकते हैं।"
              : "Generate a secure, privacy-preserving tracking link that expires automatically in 2 hours. Your family can watch your live transit journey without downloading an app."}
          </p>
          <button
            data-testid="create-share-btn"
            onClick={handleCreateShare}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <span>{loading ? "⌛" : "🔗"}</span>
            <span>
              {loading
                ? lang === "hi"
                  ? "लिंक बनाया जा रहा है..."
                  : "Generating link..."
                : lang === "hi"
                  ? "लाइव ट्रिप शेयर लिंक बनाएं"
                  : "Create Live Trip Share Link"}
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
            <span className="text-[11px] text-slate-400 block font-medium">
              {lang === "hi"
                ? "सक्रिय शेयर लिंक (2 घंटे में समाप्त):"
                : "Active Share Link (Expires in 2 hours):"}
            </span>
            <div className="flex items-center gap-2">
              <input
                data-testid="share-url-input"
                readOnly
                value={getFullShareUrl(token)}
                className="flex-1 bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg font-mono border border-slate-700 select-all"
              />
              <button
                data-testid="copy-share-btn"
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNativeShare}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/50 transition flex items-center justify-center gap-1.5"
            >
              <span>📲</span>
              <span>{lang === "hi" ? "व्हाट्सएप / मैसेज से भेजें" : "Share via WhatsApp / Messages"}</span>
            </button>

            <button
              data-testid="stop-share-btn"
              onClick={handleStopSharing}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 transition"
            >
              🛑 {lang === "hi" ? "शेयरिंग रोकें" : "Stop Sharing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
