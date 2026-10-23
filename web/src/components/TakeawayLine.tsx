import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export interface TakeawayLineProps {
  extraMin: number;
  savedMin: number;
  className?: string;
  lang?: "en" | "hi";
}

export function TakeawayLine({ extraMin, savedMin, className = "" }: TakeawayLineProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === "hi" ? "hi" : "en";

  return (
    <div
      data-testid="takeaway-line"
      className={`p-3.5 rounded-xl bg-[#EFF6FF] border border-[#B9D3FC] text-[#111827] flex items-start gap-2.5 shadow-sm ${className}`}
    >
      <Sparkles className="w-5 h-5 text-[#0F5BD8] shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm font-semibold leading-relaxed">
        {currentLang === "hi" ? (
          <span>
            <strong className="text-[#0F5BD8]">{extraMin}</strong> मिनट ज़्यादा, लेकिन सुनसान स्टॉप पर{" "}
            <strong className="text-[#047857]">{savedMin}</strong> मिनट कम इंतज़ार।
          </span>
        ) : (
          <span>
            <strong className="text-[#0F5BD8]">{extraMin}</strong> minutes longer, but{" "}
            <strong className="text-[#047857]">{savedMin}</strong> minutes less waiting at a quiet stop.
          </span>
        )}
      </p>
    </div>
  );
}
