export interface WhyListProps {
  items: string[];
  title?: string;
  className?: string;
}

export function WhyList({ items, title = "Why this rating?", className = "" }: WhyListProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`space-y-2 text-left ${className}`}>
      {title && <div className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">{title}</div>}
      <ul className="space-y-1.5 text-sm text-[#111827]">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F5BD8] mt-2 shrink-0" aria-hidden="true" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
