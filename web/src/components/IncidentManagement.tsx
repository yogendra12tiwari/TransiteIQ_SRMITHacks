import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card } from "./primitives/Card";
import { Button } from "./primitives/Button";
import { ReviewQueue } from "./ReviewQueue";
import type { IncidentStatus } from "@transitiq/shared";

interface IncidentItem {
  id: string;
  kind: "alert" | "report";
  category: string;
  location: string;
  status: IncidentStatus;
  note: string;
  reportedAt: string;
}

const INITIAL_INCIDENTS: IncidentItem[] = [
  {
    id: "inc_001",
    kind: "report",
    category: "poor_lighting",
    location: "Stop A (Hazratganj)",
    status: "IN_REVIEW",
    note: "Municipal lighting crew notified; inspection scheduled for 21:00.",
    reportedAt: "Today, 19:42",
  },
  {
    id: "inc_002",
    kind: "alert",
    category: "DELAY",
    location: "Route 23 — Hazratganj to Gomti Nagar",
    status: "NEW",
    note: "Traffic bottleneck at Lohia Crossing.",
    reportedAt: "Today, 20:05",
  },
  {
    id: "inc_003",
    kind: "report",
    category: "harassment_concern",
    location: "Stop A (Hazratganj)",
    status: "IN_REVIEW",
    note: "Escalated to human review queue; transit marshal dispatch recommended.",
    reportedAt: "Today, 18:30",
  },
  {
    id: "inc_004",
    kind: "alert",
    category: "STALL",
    location: "Bus 11 (Charbagh)",
    status: "RESOLVED",
    note: "Mechanical stall cleared. Bus back on route.",
    reportedAt: "Today, 17:15",
  },
];

export function IncidentManagement() {
  const [incidents, setIncidents] = useState<IncidentItem[]>(INITIAL_INCIDENTS);
  const [statusFilter, setStatusFilter] = useState<"ALL" | IncidentStatus>("ALL");
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [noteEdit, setNoteEdit] = useState("");

  const filteredIncidents = incidents.filter((inc) => statusFilter === "ALL" || inc.status === statusFilter);

  const handleSelectIncident = (inc: IncidentItem) => {
    setSelectedIncident(inc);
    setNoteEdit(inc.note);
  };

  const handleUpdateStatus = (newStatus: IncidentStatus) => {
    if (!selectedIncident) return;
    const updated = incidents.map((item) =>
      item.id === selectedIncident.id ? { ...item, status: newStatus, note: noteEdit } : item,
    );
    setIncidents(updated);
    setSelectedIncident({ ...selectedIncident, status: newStatus, note: noteEdit });
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top filter and metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-base text-white">Unified Incident &amp; Signal Management</h3>
            <p className="text-xs text-slate-400">
              Track, review, and resolve transit disruptions and community safety reports (F29)
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-800 p-1 rounded-lg">
          {(["ALL", "NEW", "IN_REVIEW", "RESOLVED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer transition ${
                statusFilter === st ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents Table / List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="space-y-2">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-slate-800 border-[#0F5BD8] ring-2 ring-[#0F5BD8]/30"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inc.kind === "alert"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {inc.kind.toUpperCase()}
                      </span>
                      <span className="font-bold text-sm text-white">{inc.category}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.status === "NEW"
                          ? "bg-rose-500/20 text-rose-400"
                          : inc.status === "IN_REVIEW"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 mt-2 flex items-center justify-between">
                    <span>{inc.location}</span>
                    <span className="text-slate-500 text-[11px]">{inc.reportedAt}</span>
                  </div>

                  {inc.note && (
                    <div className="text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <strong>Operator Note:</strong> {inc.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Incident Resolution Panel (1 col) */}
        <div className="space-y-4">
          <Card className="p-4 bg-slate-900 border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
              Incident Resolution &amp; Notes
            </h4>

            {selectedIncident ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Incident ID:</span>
                  <span className="font-mono font-bold text-white">{selectedIncident.id}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Status:</span>
                  <div className="flex gap-1.5">
                    {(["NEW", "IN_REVIEW", "RESOLVED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleUpdateStatus(s)}
                        className={`flex-1 py-1.5 rounded text-[11px] font-bold cursor-pointer transition ${
                          selectedIncident.status === s
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="incident-note-textarea" className="text-slate-400 block mb-1">
                    Operator Notes / Dispatch Log:
                  </label>
                  <textarea
                    id="incident-note-textarea"
                    rows={3}
                    value={noteEdit}
                    onChange={(e) => setNoteEdit(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                    placeholder="Add operational notes or resolution details..."
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus(selectedIncident.status)}
                  className="w-full py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Save Notes &amp; Status
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-6">
                Select an incident from the list to update status and add notes.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Human Harassment Review Queue */}
      <div className="pt-4 border-t border-slate-800">
        <ReviewQueue />
      </div>
    </div>
  );
}
