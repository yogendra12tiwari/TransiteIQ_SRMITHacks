import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export interface HourlyWaitPoint {
  hour: string;
  waitMin: number;
  benchmarkMin: number;
}

interface WaitByHourChartProps {
  stopName: string;
  data?: HourlyWaitPoint[];
}

const DEFAULT_HOURLY_DATA: HourlyWaitPoint[] = [
  { hour: "16:00", waitMin: 9, benchmarkMin: 8 },
  { hour: "17:00", waitMin: 12, benchmarkMin: 10 },
  { hour: "18:00", waitMin: 15, benchmarkMin: 10 },
  { hour: "19:00", waitMin: 19, benchmarkMin: 10 },
  { hour: "20:00", waitMin: 18, benchmarkMin: 10 },
  { hour: "21:00", waitMin: 22, benchmarkMin: 10 },
  { hour: "22:00", waitMin: 16, benchmarkMin: 8 },
];

export function WaitByHourChart({ stopName, data = DEFAULT_HOURLY_DATA }: WaitByHourChartProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-sm font-semibold text-slate-100">
          Evening Wait Duration by Hour &mdash; <span className="text-emerald-400">{stopName}</span>
        </h3>
        <span className="text-xs text-slate-400">Peak wait: 22 min @ 21:00</span>
      </div>
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} unit="m" domain={[0, 25]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "0.5rem",
                fontSize: "12px",
                color: "#f8fafc",
              }}
              formatter={(val) => [`${typeof val === "number" ? val : 0} min`, "Avg Wait"]}
            />
            <Bar dataKey="waitMin" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Actual Wait" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
          <span>Average Wait (minutes)</span>
        </div>
        <span className="text-slate-500">Scheduled standard: 10 min target</span>
      </div>
    </div>
  );
}
