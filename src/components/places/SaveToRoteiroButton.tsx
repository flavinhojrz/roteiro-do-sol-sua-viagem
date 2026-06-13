import { Check, Plus } from "lucide-react";
import { toggleSavedPlace, useIsSaved } from "@/lib/roteiro/saved-places";
import { cn } from "@/lib/utils";

type SaveToRoteiroButtonProps = {
  placeId: string;
  className?: string;
  /** "full" para botão grande (detalhe); "compact" para card. */
  size?: "full" | "compact";
};

/**
 * Botão "Quero conhecer" → "No seu roteiro". Persiste localmente e dá feedback
 * de estado. Não exige login.
 */
export function SaveToRoteiroButton({
  placeId,
  className,
  size = "full",
}: SaveToRoteiroButtonProps) {
  const saved = useIsSaved(placeId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSavedPlace(placeId);
      }}
      className={cn(
        "press inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-all",
        size === "full" ? "px-6 py-3 text-sm" : "px-4 py-2 text-xs",
        saved
          ? "bg-sea-soft text-sea hover:bg-sea-soft/80"
          : "bg-gradient-sun text-ink shadow-coral hover:shadow-coral-lg",
        className,
      )}
    >
      {saved ? (
        <>
          <Check size={size === "full" ? 16 : 14} /> No seu roteiro
        </>
      ) : (
        <>
          <Plus size={size === "full" ? 16 : 14} /> Quero conhecer
        </>
      )}
    </button>
  );
}
