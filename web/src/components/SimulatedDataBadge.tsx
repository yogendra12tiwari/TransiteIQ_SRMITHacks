import { useTranslation } from "react-i18next";

export function SimulatedDataBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="simulated-data-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF4E0] text-[#B45309] border border-[#FDE2B0] select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" aria-hidden="true" />
      <span>{t("badge.simulated", "Simulated data")}</span>
    </div>
  );
}
