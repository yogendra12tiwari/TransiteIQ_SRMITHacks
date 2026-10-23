import { RiskBadge } from "./RiskBadge";

export interface PriorityStopRow {
  stopId: string;
  stopName: string;
  avgEveningWaitMin: number;
  safetyReportsCount: number;
  riskBand: "low" | "medium" | "high";
  recommendedAction: string;
  ridershipPerEvening: number;
}

interface PriorityTableProps {
  stops: PriorityStopRow[];
  selectedStopId?: string;
  onSelectStop?: (stopId: string) => void;
}

const RISK_LEVEL_MAP: Record<string, "Low" | "Medium" | "High"> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function PriorityTable({ stops, selectedStopId, onSelectStop }: PriorityTableProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Transit Authority Priority Intervention Queue</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by composite exposure score (Wait Risk &times; Evening Ridership)
          </p>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 border border-amber-600/40 text-amber-300">
          Operator View
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
            <tr>
              <th scope="col" className="py-3 px-4">
                Stop Name
              </th>
              <th scope="col" className="py-3 px-4">
                Headline Status
              </th>
              <th scope="col" className="py-3 px-4">
                Wait Risk
              </th>
              <th scope="col" className="py-3 px-4">
                Recommended Action
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Riders/Eve
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {stops.map((row) => {
              const isSelected = row.stopId === selectedStopId;
              const isStopA = row.stopId === "stop_A";

              return (
                <tr
                  key={row.stopId}
                  onClick={() => onSelectStop?.(row.stopId)}
                  className={`cursor-pointer transition ${
                    isSelected ? "bg-slate-800/90 ring-1 ring-emerald-500/50" : "hover:bg-slate-800/50"
                  } ${isStopA ? "bg-amber-950/20 font-medium" : ""}`}
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-100 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{row.stopName}</span>
                      {isStopA && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                          Priority #1
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="headline-status font-medium">
                      {`${row.stopName}: average evening wait ${row.avgEveningWaitMin} minutes, ${row.safetyReportsCount} safety-related reports`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <RiskBadge label={RISK_LEVEL_MAP[row.riskBand] ?? "Low"} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                    <span className="text-emerald-400 font-medium mr-1.5">&bull;</span>
                    {row.recommendedAction}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                    {row.ridershipPerEvening}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
