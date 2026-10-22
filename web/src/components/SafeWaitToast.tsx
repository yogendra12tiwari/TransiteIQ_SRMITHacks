import { useEffect } from "react";
import type { SafeWaitDecision } from "@transitiq/shared";

interface SafeWaitToastProps {
  decision: SafeWaitDecision;
  onAcknowledge: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  lang?: "en" | "hi";
}

export function SafeWaitToast({
  decision,
  onAcknowledge,
  onSnooze,
  onDismiss,
  lang = "en",
}: SafeWaitToastProps) {
  useEffect(() => {
    // Attempt haptic vibration where supported on mobile devices (M5-16)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        if (decision.urgency === "urgent") {
          navigator.vibrate([300, 100, 300, 100, 400]);
        } else {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (e) {
        console.debug("Haptic vibration skipped:", e);
      }
    }
  }, [decision.urgency]);

  if (!decision.message) return null;

  const isUrgent = decision.urgency === "urgent";
  const isWarning = decision.urgency === "warning";

  return (
    <aside
      aria-label="Safe Wait Alert"
      data-testid="safe-wait-toast"
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-bounce-short ${
        isUrgent
          ? "bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/50"
          : isWarning
            ? "bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/50"
            : "bg-indigo-950/95 border-indigo-500 text-indigo-100 shadow-indigo-950/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isUrgent ? "🚨" : isWarning ? "⚠️" : "🛡️"}</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {isUrgent
              ? lang === "hi"
                ? "अति आवश्यक: तुरंत निकलें!"
                : "Urgent: Bus Arriving Sooner!"
              : isWarning
                ? lang === "hi"
                  ? "चेतावनी: रूट अपडेट"
                  : "Route Alert: Possible Skip"
                : lang === "hi"
                  ? "सेफ वेट: निकलने का समय"
                  : "Safe Wait: Time to Leave"}
          </span>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white text-xs p-1"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>

      <p className="mt-2 text-sm font-semibold text-white leading-snug">{decision.message}</p>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          data-testid="toast-ack-btn"
          onClick={onAcknowledge}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition shadow-sm ${
            isUrgent
              ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
              : isWarning
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
          }`}
        >
          ✓ {lang === "hi" ? "निकल रहा हूँ (Leave Now)" : "I'm Leaving Now"}
        </button>

        {!isUrgent && (
          <button
            data-testid="toast-snooze-btn"
            onClick={onSnooze}
            className="py-2 px-3 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            ⏰ {lang === "hi" ? "1 मिनट स्नूज़" : "Snooze 1 min"}
          </button>
        )}
      </div>
    </aside>
  );
}
