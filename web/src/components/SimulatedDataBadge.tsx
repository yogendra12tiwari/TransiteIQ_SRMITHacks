export function SimulatedDataBadge() {
  return (
    <div
      data-testid="simulated-data-badge"
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 tracking-wide uppercase"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
      Simulated Data
    </div>
  );
}
