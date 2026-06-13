import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { useState, type MouseEvent, type ReactElement, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmActionDialogProps = {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  errorMessage: string;
  eyebrow?: string;
  icon?: ReactNode;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Confirmando...",
  errorMessage,
  eyebrow = "Ação permanente",
  icon = <Trash2 size={24} />,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) setError(null);
  };

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await onConfirm();
      setOpen(false);
    } catch (confirmError) {
      if (import.meta.env.DEV) {
        console.error("Falha em ação confirmada:", confirmError);
      }
      setError(errorMessage);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-coral-soft/70 to-transparent"
          aria-hidden="true"
        />

        <AlertDialogHeader className="relative items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-soft text-coral shadow-soft">
            {icon}
          </div>
          <span className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-coral">
            {eyebrow}
          </span>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="max-w-sm">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl bg-coral-soft/60 px-4 py-3 text-left text-sm font-semibold leading-5 text-coral"
          >
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            className="h-11 flex-1 rounded-full border-0 bg-sand-soft px-5 font-bold text-ink shadow-none hover:bg-sand"
          >
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleConfirm}
            className="h-11 flex-1 rounded-full bg-coral px-5 font-extrabold text-white shadow-coral hover:bg-coral/90 hover:shadow-coral-lg"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {pending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
