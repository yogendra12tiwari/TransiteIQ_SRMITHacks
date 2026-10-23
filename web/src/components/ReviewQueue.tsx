import { useState } from "react";

export interface QueueItem {
  id: string;
  stopName: string;
  category: string;
  textRedacted: string;
  status: "new" | "in_review" | "resolved";
  createdAt: number;
  reviewerNotes?: string;
}

interface ReviewQueueProps {
  items?: QueueItem[];
  onUpdateStatus?: (id: string, status: "new" | "in_review" | "resolved", notes?: string) => void;
}

const DEFAULT_QUEUE_ITEMS: QueueItem[] = [
  {
    id: "rev_001",
    stopName: "Stop A (Hazratganj)",
    category: "harassment_concern",
    textRedacted:
      "Unlit corner behind the transit shelter; aggressive group loitering around [REDACTED_TIME].",
    status: "new",
    createdAt: Date.now() - 3600000 * 2,
    reviewerNotes: "",
  },
  {
    id: "rev_002",
    stopName: "Stop B (Charbagh)",
    category: "harassment_concern",
    textRedacted: "Persistent catcalling near footbridge exit. Rider reported at [REDACTED_TIME].",
    status: "in_review",
    createdAt: Date.now() - 3600000 * 5,
    reviewerNotes: "Forwarded to Lucknow Transit Marshal team for night patrol deployment.",
  },
  {
    id: "rev_003",
    stopName: "Stop D (Polytechnic)",
    category: "harassment_concern",
    textRedacted: "Lack of lighting near auto stand creates unsafe waiting condition.",
    status: "resolved",
    createdAt: Date.now() - 3600000 * 24,
    reviewerNotes: "High-mast lighting repaired by municipal work order #4892.",
  },
];

export function ReviewQueue({ items = DEFAULT_QUEUE_ITEMS, onUpdateStatus }: ReviewQueueProps) {
  const [localItems, setLocalItems] = useState<QueueItem[]>(items);

  function handleStatusChange(id: string, newStatus: "new" | "in_review" | "resolved") {
    setLocalItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    onUpdateStatus?.(id, newStatus);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Confidential Human Review Queue</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
              RESTRICTED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Harassment and sensitive safety reports requiring supervisor verification
          </p>
        </div>
        <span className="text-xs text-slate-400">
          Pending triage:{" "}
          <strong className="text-amber-400">
            {localItems.filter((i) => i.status !== "resolved").length}
          </strong>
        </span>
      </div>

      <div className="space-y-3">
        {localItems.map((item) => {
          const statusBadge =
            item.status === "new"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
              : item.status === "in_review"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

          return (
            <div
              key={item.id}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 space-y-2.5 text-xs transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{item.stopName}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border ${statusBadge}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80 font-mono text-[11px] leading-relaxed">
                &ldquo;{item.textRedacted}&rdquo;
              </p>

              {item.reviewerNotes && (
                <div className="text-[11px] text-slate-400 bg-slate-900/40 px-2 py-1.5 rounded">
                  <strong className="text-slate-300">Supervisor Note:</strong> {item.reviewerNotes}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 text-[10px]">
                  ID: {item.id} &bull; PII Filter: Verified Redacted
                </span>
                <div className="flex items-center gap-1.5">
                  {item.status !== "in_review" && (
                    <button
                      onClick={() => handleStatusChange(item.id, "in_review")}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition"
                    >
                      Mark In Review
                    </button>
                  )}
                  {item.status !== "resolved" && (
                    <button
                      onClick={() => handleStatusChange(item.id, "resolved")}
                      className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded text-[11px] transition"
                    >
                      Resolve &amp; Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
