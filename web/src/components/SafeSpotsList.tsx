import type { NearbySafeSpot } from "@transitiq/shared";

interface SafeSpotsListProps {
  safeSpots: NearbySafeSpot[];
  stopName?: string;
  lang?: "en" | "hi";
}

function getSpotIcon(kind: string) {
  switch (kind) {
    case "pharmacy":
      return "🏥";
    case "petrol_pump":
      return "⛽";
    case "shop_24h":
      return "🏪";
    case "mall_entrance":
      return "🏬";
    default:
      return "🛡️";
  }
}

export function SafeSpotsList({ safeSpots, stopName = "this stop", lang = "en" }: SafeSpotsListProps) {
  if (safeSpots.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 text-center">
        {lang === "hi"
          ? "250 मीटर के दायरे में कोई सत्यापित सेफ स्पॉट दर्ज नहीं है।"
          : "No verified safe spots registered within 250m."}
      </div>
    );
  }

  return (
    <div
      data-testid="safe-spots-list"
      className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-md space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            {lang === "hi"
              ? `${stopName} के पास सुरक्षित स्थान (${safeSpots.length})`
              : `Safe Waiting Spots near ${stopName} (${safeSpots.length})`}
          </h3>
        </div>
        <span className="text-[11px] text-emerald-400 font-medium">
          {lang === "hi" ? "इनडोर प्रतीक्षा करें" : "Wait Indoors"}
        </span>
      </div>

      <div className="space-y-2">
        {safeSpots.map((spot) => (
          <div
            key={spot.id}
            data-testid="safe-spot-item"
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{getSpotIcon(spot.kind)}</span>
              <div>
                <p className="font-semibold text-white">{spot.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {spot.kind.replace("_", " ")} • {spot.distanceM}m away
                </p>
              </div>
            </div>

            {spot.openLate && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{lang === "hi" ? "देर रात खुला" : "Open Late"}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
