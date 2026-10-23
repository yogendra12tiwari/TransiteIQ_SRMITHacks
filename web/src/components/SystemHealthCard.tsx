export interface SystemHealthMetrics {
  aiSuccessRatePercent: number;
  aiFallbackRatePercent: number;
  guardBlocksCount: number;
  reportLatencySeconds: number;
  etaMaeMinutes: number;
  etaMaeBaselineMinutes: number;
}

const DEFAULT_METRICS: SystemHealthMetrics = {
  aiSuccessRatePercent: 94.2,
  aiFallbackRatePercent: 5.8,
  guardBlocksCount: 19,
  reportLatencySeconds: 1.8,
  etaMaeMinutes: 1.63,
  etaMaeBaselineMinutes: 3.89,
};

export function SystemHealthCard({ metrics = DEFAULT_METRICS }: { metrics?: SystemHealthMetrics }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">System Integrity &amp; Model Health</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time guardrail, AI pipeline, and latency metrics
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Nominal
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">AI Triage Pipeline</span>
          <div className="text-lg font-bold text-slate-100">
            {metrics.aiSuccessRatePercent}%{" "}
            <span className="text-xs font-normal text-emerald-400">Success</span>
          </div>
          <span className="text-[10px] text-slate-500">Fallback rate: {metrics.aiFallbackRatePercent}%</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">Guardrail Filters</span>
          <div className="text-lg font-bold text-amber-400">
            {metrics.guardBlocksCount} <span className="text-xs font-normal text-slate-400">Blocked</span>
          </div>
          <span className="text-[10px] text-slate-500">PII Redactions &amp; Injections</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">Dashboard Sync</span>
          <div className="text-lg font-bold text-emerald-400">
            {metrics.reportLatencySeconds}s{" "}
            <span className="text-xs font-normal text-slate-400">Latency</span>
          </div>
          <span className="text-[10px] text-slate-500">Target: &lt; 5.0s (PRD §10)</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">ETA MAE Accuracy</span>
          <div className="text-lg font-bold text-slate-100">
            {metrics.etaMaeMinutes}m <span className="text-xs font-normal text-emerald-400">-58%</span>
          </div>
          <span className="text-[10px] text-slate-500">
            vs {metrics.etaMaeBaselineMinutes}m static baseline
          </span>
        </div>
      </div>
    </div>
  );
}
