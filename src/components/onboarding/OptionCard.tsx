import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function OptionCard({
  title,
  description,
  selected,
  onClick,
  icon,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative w-full text-left rounded-2xl border-2 bg-white p-5 md:p-6 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-soft-lg",
        selected
          ? "border-coral shadow-coral bg-coral-soft/40"
          : "border-transparent shadow-soft hover:border-sea/30",
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <span className="text-2xl md:text-3xl leading-none mt-0.5">{icon}</span>}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base md:text-lg text-ink">{title}</h3>
          {description && <p className="mt-1 text-sm text-ink/65 leading-relaxed">{description}</p>}
        </div>
        <span
          aria-hidden
          className={cn(
            "shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all",
            selected
              ? "bg-coral border-coral text-white scale-100"
              : "border-ink/15 text-transparent scale-90 group-hover:border-ink/30",
          )}
        >
          <Check size={16} strokeWidth={3} />
        </span>
      </div>
    </button>
  );
}
