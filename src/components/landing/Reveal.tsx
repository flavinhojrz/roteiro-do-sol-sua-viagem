import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: React.ElementType;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <As
      ref={ref as never}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", shown && "is-visible", className)}
    >
      {children}
    </As>
  );
}
