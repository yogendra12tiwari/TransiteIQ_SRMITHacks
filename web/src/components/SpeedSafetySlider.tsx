interface SpeedSafetySliderProps {
  alpha: number; // 0.0 (safest) to 1.0 (fastest)
  onChange: (newAlpha: number) => void;
  lang?: "en" | "hi";
}

export function SpeedSafetySlider({ alpha, onChange, lang = "en" }: SpeedSafetySliderProps) {
  const getModeLabel = (a: number) => {
    if (a <= 0.3) {
      return lang === "hi" ? "सुरक्षा प्राथमिकता (कम एक्सपोज़र)" : "Prioritize Safer Route";
    }
    if (a >= 0.7) {
      return lang === "hi" ? "गति प्राथमिकता (तेज़ यात्रा)" : "Prioritize Faster Arrival";
    }
    return lang === "hi" ? "संतुलित (गति + सुरक्षा)" : "Balanced (Speed + Safety)";
  };

  const getModeColor = (a: number) => {
    if (a <= 0.3) return "text-emerald-400";
    if (a >= 0.7) return "text-rose-400";
    return "text-indigo-400";
  };

  return (
    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-md space-y-2.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="speed-safety-slider"
          className="text-xs font-semibold text-slate-300 uppercase tracking-wider"
        >
          {lang === "hi" ? "प्राथमिकता स्लाइडर (गति बनाम सुरक्षा)" : "Speed vs. Safety Preference"}
        </label>
        <span
          data-testid="slider-mode-label"
          className={`text-xs font-bold font-mono ${getModeColor(alpha)}`}
        >
          {getModeLabel(alpha)}
        </span>
      </div>

      <div className="space-y-1">
        <input
          id="speed-safety-slider"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={alpha}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label="Speed versus safety ranking preference"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={alpha}
          aria-valuetext={getModeLabel(alpha)}
          className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
        />

        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
          <span className="text-emerald-400 flex items-center gap-1">
            <span>🛡️</span>
            <span>{lang === "hi" ? "अति सुरक्षित (α=0)" : "Safest (α=0)"}</span>
          </span>
          <span className="text-slate-400">{lang === "hi" ? "संतुलित (α=0.5)" : "Balanced (α=0.5)"}</span>
          <span className="text-rose-400 flex items-center gap-1">
            <span>⚡</span>
            <span>{lang === "hi" ? "सबसे तेज़ (α=1)" : "Fastest (α=1)"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
