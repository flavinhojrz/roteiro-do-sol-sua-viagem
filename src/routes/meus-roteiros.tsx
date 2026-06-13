import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccountAreaNav } from "@/components/account/AccountAreaNav";
import { ConfirmActionDialog } from "@/components/feedback/ConfirmActionDialog";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { signInWithGoogle, useSession } from "@/lib/auth/session";
import {
  clearEditingItinerary,
  getEditingItinerary,
  setEditingItinerary,
} from "@/lib/roteiro/editing-state";
import { clearSavedPlaces, setSavedPlaceIds } from "@/lib/roteiro/saved-places";
import {
  getItineraryForEdit,
  listMyItineraries,
  deleteItinerary,
  type SavedItinerarySummary,
} from "@/lib/supabase/itineraries";

export const Route = createFileRoute("/meus-roteiros")({
  head: () => ({
    meta: [
      { title: "Meus Roteiros — Roteiro do Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MeusRoteirosPage,
});

function MeusRoteirosPage() {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const {
    data: itineraries = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-itineraries", session?.user.id],
    queryFn: listMyItineraries,
    enabled: Boolean(session),
  });

  const handleCreateNew = () => {
    clearSavedPlaces();
    clearEditingItinerary();
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-sky">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-40 animate-sun-pulse md:h-96 md:w-96" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 h-24 w-[110%] animate-wave-drift md:h-32" />

      <div className="relative mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-coral"
        >
          <ArrowLeft size={16} /> Voltar para a home
        </Link>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sea backdrop-blur">
              ☀️ Meus Roteiros
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">
              Seus roteiros salvos
            </h1>
          </div>
          {session ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="press inline-flex items-center gap-2 rounded-full bg-gradient-sun px-5 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
            >
              <Plus size={16} /> Criar novo roteiro
            </button>
          ) : null}
        </div>

        {session ? <AccountAreaNav active="itineraries" /> : null}

        {sessionLoading ? (
          <Status message="Carregando..." />
        ) : !session ? (
          <LoginGate />
        ) : isLoading ? (
          <Status message="Carregando seus roteiros..." />
        ) : isError ? (
          <Status
            variant="error"
            message="Não conseguimos carregar seus roteiros agora. Tente novamente em instantes."
          />
        ) : itineraries.length === 0 ? (
          <EmptyState onCreateNew={handleCreateNew} />
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {itineraries.map((itinerary) => (
              <ItineraryCard key={itinerary.id} itinerary={itinerary} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ItineraryCard({ itinerary }: { itinerary: SavedItinerarySummary }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opening, setOpening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    setError(null);
    setOpening(true);
    try {
      const detail = await getItineraryForEdit(itinerary.id);
      setSavedPlaceIds(detail.placeIds);
      setEditingItinerary({
        id: detail.id,
        name: detail.name,
        publicSlug: detail.publicSlug,
      });
      navigate({ to: "/meu-roteiro" });
    } catch (editError) {
      if (import.meta.env.DEV) console.error("Falha ao abrir roteiro:", editError);
      setError("Não conseguimos abrir este roteiro agora.");
      setOpening(false);
    }
  };

  const handleCopy = async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/r/${itinerary.publicSlug}` : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado", {
        description: "O link de compartilhamento está pronto para enviar.",
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      toast.error("Não foi possível copiar o link", {
        description: "Tente novamente ou copie o endereço diretamente do navegador.",
      });
    }
  };

  const handleDelete = async () => {
    setError(null);
    await deleteItinerary(itinerary.id);
    if (getEditingItinerary()?.id === itinerary.id) {
      clearEditingItinerary();
      clearSavedPlaces();
    }
    toast.success("Roteiro excluído", {
      description: `"${itinerary.name ?? "Roteiro sem nome"}" foi removido da sua conta.`,
    });
    await queryClient.invalidateQueries({ queryKey: ["my-itineraries"] });
  };

  return (
    <article className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold leading-tight text-ink">
          {itinerary.name ?? "Roteiro sem nome"}
        </h2>
        <ConfirmActionDialog
          trigger={
            <button
              type="button"
              aria-label={`Excluir ${itinerary.name ?? "roteiro sem nome"}`}
              title="Excluir roteiro"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-coral-soft/60 hover:text-coral"
            >
              <MoreHorizontal size={18} />
            </button>
          }
          title="Excluir este roteiro?"
          description={
            <>
              O roteiro <strong className="text-ink">“{itinerary.name ?? "Sem nome"}”</strong> e seu
              link de compartilhamento serão removidos permanentemente.
            </>
          }
          confirmLabel="Excluir roteiro"
          pendingLabel="Excluindo..."
          errorMessage="Não conseguimos excluir este roteiro agora. Tente novamente em instantes."
          onConfirm={handleDelete}
        />
      </div>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-sea">
        <MapPin size={14} className="shrink-0" />
        {itinerary.placeCount} {itinerary.placeCount === 1 ? "lugar" : "lugares"}
      </p>
      <p className="mt-1 text-xs font-semibold text-ink/50">
        Atualizado em {formatDate(itinerary.updatedAt)}
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-5">
        <button
          type="button"
          onClick={handleEdit}
          disabled={opening}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-sun px-5 py-2.5 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg disabled:opacity-60"
        >
          {opening ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
          {opening ? "Abrindo..." : "Abrir / Editar"}
        </button>
        {itinerary.isPublic ? (
          <button
            type="button"
            onClick={handleCopy}
            className="press inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-soft ring-1 ring-ink/10 hover:shadow-soft-lg"
          >
            {copied ? <Check size={15} className="text-sea" /> : <Copy size={15} />}
            {copied ? "Link copiado!" : "Copiar link de compartilhar"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-center text-sm font-bold text-coral">{error}</p> : null}
    </article>
  );
}

function LoginGate() {
  const [connecting, setConnecting] = useState(false);

  const handleGoogle = async () => {
    setConnecting(true);
    try {
      await signInWithGoogle("/meus-roteiros");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Falha no login com Google:", error);
      setConnecting(false);
    }
  };

  return (
    <div className="mt-12 rounded-3xl bg-white/85 px-6 py-14 text-center shadow-soft backdrop-blur animate-fade-up">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-soft">
        ☀️
      </div>
      <h2 className="mt-5 font-display text-xl font-extrabold text-ink">
        Entre para ver seus roteiros
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-ink/65">
        Faça login com Google para acessar os roteiros que você salvou.
      </p>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={connecting}
        className="press mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg disabled:opacity-60"
      >
        {connecting ? <Loader2 size={16} className="animate-spin" /> : null}
        {connecting ? "Entrando..." : "Continuar com Google"}
      </button>
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="mt-12 rounded-3xl bg-white/85 px-6 py-14 text-center shadow-soft backdrop-blur animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sun/50 via-aqua/40 to-sea-soft text-3xl shadow-soft">
        🗺️
      </div>
      <h2 className="mt-5 font-display text-xl font-extrabold text-ink">
        Você ainda não salvou nenhum roteiro
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-ink/65">
        Monte um roteiro com seus lugares favoritos e salve para acessar quando quiser.
      </p>
      <button
        type="button"
        onClick={onCreateNew}
        className="press mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
      >
        <Plus size={16} /> Criar meu primeiro roteiro
      </button>
    </div>
  );
}

function Status({
  message,
  variant = "default",
}: {
  message: string;
  variant?: "default" | "error";
}) {
  return (
    <div className="mt-12 rounded-3xl bg-white/80 px-6 py-12 text-center shadow-soft backdrop-blur animate-fade-up">
      <div
        className={`mx-auto h-12 w-12 rounded-2xl shadow-soft ${
          variant === "error"
            ? "bg-coral-soft text-coral"
            : "bg-gradient-to-br from-sun/50 via-aqua/40 to-sea-soft"
        }`}
        aria-hidden="true"
      />
      <p className="mt-4 text-base font-bold text-ink">{message}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
