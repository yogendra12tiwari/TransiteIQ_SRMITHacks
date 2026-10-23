import { NavLink } from "react-router-dom";
import { Bus, Bell, AlertTriangle } from "lucide-react";

export interface TabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const DEFAULT_TABS: TabItem[] = [
  { to: "/", label: "Home", icon: Bus },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/report", label: "Report", icon: AlertTriangle },
];

export function BottomTabs({
  tabs = DEFAULT_TABS,
  className = "",
}: {
  tabs?: TabItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Main Navigation"
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-[#D8DEE6] z-40 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="max-w-md mx-auto grid grid-cols-3 gap-1 px-2 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `min-h-[48px] py-1 px-2 rounded-[12px] flex flex-col items-center justify-center gap-1 transition-colors select-none focus:outline-none focus:ring-3 focus:ring-[#111827] ${
                  isActive
                    ? "text-[#0F5BD8] font-bold"
                    : "text-[#4B5563] font-medium hover:text-[#111827] hover:bg-[#F5F7FA]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-[#0F5BD8]" : "text-[#4B5563]"}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs leading-none">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
