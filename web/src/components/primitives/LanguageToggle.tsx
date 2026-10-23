import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === "hi" ? "hi" : "en";
  const targetLang = currentLang === "en" ? "hi" : "en";
  const targetLabel = targetLang === "hi" ? "हिंदी" : "English";

  const handleToggle = () => {
    i18n.changeLanguage(targetLang);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch language to ${targetLabel}`}
      className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-full border border-[#D8DEE6] bg-white text-[#111827] text-sm font-semibold hover:bg-[#F5F7FA] active:bg-[#EAEFF5] focus:outline-none focus:ring-3 focus:ring-[#111827] flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors ${className}`}
    >
      <Globe className="w-4 h-4 text-[#4B5563]" aria-hidden="true" />
      <span>{targetLabel}</span>
    </button>
  );
}
