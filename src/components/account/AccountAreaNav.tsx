import { Link } from "@tanstack/react-router";
import { Map, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountAreaNavProps = {
  active: "itineraries" | "account";
};

export function AccountAreaNav({ active }: AccountAreaNavProps) {
  const itemClass =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors sm:flex-none";

  return (
    <nav
      aria-label="Área da conta"
      className="mt-7 inline-flex w-full rounded-full bg-white/65 p-1 shadow-soft backdrop-blur sm:w-auto"
    >
      <Link
        to="/meus-roteiros"
        aria-current={active === "itineraries" ? "page" : undefined}
        className={cn(
          itemClass,
          active === "itineraries"
            ? "bg-white text-ink shadow-soft"
            : "text-ink/55 hover:text-coral",
        )}
      >
        <Map size={16} />
        Meus roteiros
      </Link>
      <Link
        to="/minha-conta"
        aria-current={active === "account" ? "page" : undefined}
        className={cn(
          itemClass,
          active === "account" ? "bg-white text-ink shadow-soft" : "text-ink/55 hover:text-coral",
        )}
      >
        <UserRound size={16} />
        Minha conta e dados
      </Link>
    </nav>
  );
}
