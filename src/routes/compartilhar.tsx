import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Loader2, MessageCircle, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { signInWithGoogle, useSession } from "@/lib/auth/session";
import { loadTravelAnswers } from "@/lib/recommendations/answers-storage";
import { personalizedLimitForDays } from "@/lib/recommendations/personalize";
import { recommendPlaces } from "@/lib/recommendations/recommend-places";
import {
  clearEditingItinerary,
  getEditingItinerary,
  setEditingItinerary,
  useEditingItinerary,
} from "@/lib/roteiro/editing-state";
import { clearSavedPlaces, useSavedPlaceIds } from "@/lib/roteiro/saved-places";
import { createItinerary, ItinerarySaveError, updateItinerary } from "@/lib/supabase/itineraries";
import { getPublishedPlaces } from "@/lib/supabase/places";

export const Route = createFileRoute("/compartilhar")({
  head: () => ({
    meta: [
      { title: "Compartilhar roteiro — Roteiro do Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CompartilharPage,
});

// Marca que o usuário pediu para compartilhar antes de logar, para retomar o
// fluxo automaticamente quando ele voltar autenticado do Google.
const SHARE_INTENT_KEY = "roteiro-do-sol:share-intent";

function setShareIntent() {
  try {
    sessionStorage.setItem(SHARE_INTENT_KEY, "1");
  } catch {
    // storage indisponível — segue sem auto-retomar.
  }
}

function consumeShareIntent(): boolean {
  try {
    const had = sessionStorage.getItem(SHARE_INTENT_KEY) === "1";
    sessionStorage.removeItem(SHARE_INTENT_KEY);
    return had;
  } catch {
    return false;
  }
}

function CompartilharPage() {
  const { data: places = [] } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });
  const savedIds = useSavedPlaceIds();
  const { session, loading: sessionLoading } = useSession();
  const editing = useEditingItinerary();
  const navigate = useNavigate();

  const [name, setName] = useState(() => getEditingItinerary()?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const savedPlaces = useMemo(
    () => places.filter((place) => savedIds.includes(place.id)),
    [places, savedIds],
  );
  // Mantém a ordem em que o usuário salvou os lugares.
  const orderedPlaceIds = useMemo(
    () => savedIds.filter((id) => savedPlaces.some((place) => place.id === id)),
    [savedIds, savedPlaces],
  );

  const shareUrl =
    publicSlug && typeof window !== "undefined"
      ? `${window.location.origin}/r/${publicSlug}`
      : null;

  const shareText = shareUrl ? `Olha o roteiro que montei em Natal ☀️\n${shareUrl}` : "";
  const whatsappUrl = shareUrl ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : "";

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const answers = loadTravelAnswers();
      // Marca cada lugar com a seção do Meu Roteiro ("cabe na viagem" x "se der tempo"),
      // preservando a ordem em que o usuário salvou.
      const ranked = recommendPlaces(savedPlaces, answers).map((item) => item.place);
      const limit = personalizedLimitForDays(answers.days);
      const fitIds = new Set(ranked.slice(0, limit).map((place) => place.id));
      const items = orderedPlaceIds.map((id) => ({
        placeId: id,
        section: fitIds.has(id) ? "fits" : "if_time",
      }));

      // Editando um roteiro salvo → atualiza o mesmo (não duplica). Senão, cria.
      const current = getEditingItinerary();
      const ref = current
        ? await updateItinerary({
            id: current.id,
            name: name || current.name || null,
            items,
            answers,
          })
        : await createItinerary({ name: name || null, items, answers });

      setPublicSlug(ref.publicSlug);
      // A partir daqui, este passa a ser o roteiro "em edição".
      setEditingItinerary({
        id: ref.id,
        name: name || current?.name || null,
        publicSlug: ref.publicSlug,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        // Mantém a causa real no console em desenvolvimento, sem mostrar ao usuário.
        console.error(
          "Falha ao salvar roteiro:",
          error instanceof ItinerarySaveError ? error.technical : error,
        );
      }
      setSaveError(error instanceof Error ? error.message : "Não conseguimos salvar agora.");
    } finally {
      setSaving(false);
    }
  };

  // Retoma o compartilhamento automaticamente ao voltar autenticado do Google.
  const autoSaveStarted = useRef(false);
  useEffect(() => {
    if (autoSaveStarted.current) return;
    if (sessionLoading || !session || publicSlug || orderedPlaceIds.length === 0) return;
    if (!consumeShareIntent()) return;
    autoSaveStarted.current = true;
    void handleSave();
    // handleSave usa o estado atual; roda uma única vez (guardado pelo ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionLoading, publicSlug, orderedPlaceIds]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado", {
        description: "Agora é só enviar para quem vai viajar com você.",
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      toast.error("Não foi possível copiar o link", {
        description: "Tente novamente ou selecione o endereço exibido na tela.",
      });
    }
  };

  const handleCreateNew = () => {
    // Não apaga roteiros salvos no Supabase — só limpa o roteiro local de trabalho.
    clearSavedPlaces();
    clearEditingItinerary();
    navigate({ to: "/onboarding" });
  };

  const isEmpty = savedPlaces.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-sky">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-40 animate-sun-pulse md:h-96 md:w-96" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 h-24 w-[110%] animate-wave-drift md:h-32" />

      <div className="relative mx-auto max-w-2xl px-5 py-8 md:px-8 md:py-12">
        <Link
          to="/meu-roteiro"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-coral"
        >
          <ArrowLeft size={16} /> Voltar para Meu Roteiro
        </Link>

        {isEmpty ? (
          <EmptyShare />
        ) : (
          <div className="mt-8 animate-fade-up">
            <h1 className="font-display text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              Seu roteiro está pronto para{" "}
              <span className="bg-gradient-sun bg-clip-text text-transparent">compartilhar ☀️</span>
            </h1>
            <p className="mt-3 text-ink/65">
              {savedPlaces.length} {savedPlaces.length === 1 ? "lugar" : "lugares"} no seu roteiro
              de Natal.
            </p>

            <div className="mt-7 rounded-3xl bg-white p-5 shadow-soft md:p-6">
              <h2 className="font-display text-lg font-extrabold text-ink">Resumo do roteiro</h2>
              <ul className="mt-3 space-y-2">
                {savedPlaces.map((place) => (
                  <li
                    key={place.id}
                    className="flex items-center gap-2 text-sm font-semibold text-ink/80"
                  >
                    <span className="text-coral">•</span>
                    {place.name}
                  </li>
                ))}
              </ul>
            </div>

            {publicSlug && shareUrl ? (
              <ShareLinkReady
                roteiroName={name || editing?.name || null}
                shareUrl={shareUrl}
                whatsappUrl={whatsappUrl}
                copied={copied}
                onCopy={handleCopy}
                onCreateNew={handleCreateNew}
              />
            ) : sessionLoading ? (
              <p className="mt-7 text-center text-sm font-bold text-ink/55">Carregando...</p>
            ) : session ? (
              <SavePanel
                name={name}
                onNameChange={setName}
                saving={saving}
                error={saveError}
                onSave={handleSave}
                isEditing={Boolean(editing)}
              />
            ) : (
              <LoginPanel placeCount={savedPlaces.length} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SavePanel({
  name,
  onNameChange,
  saving,
  error,
  onSave,
  isEditing,
}: {
  name: string;
  onNameChange: (value: string) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  isEditing: boolean;
}) {
  return (
    <div className="mt-7">
      <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-sea-soft/60 px-3 py-1 text-xs font-bold text-sea">
        <Check size={13} /> {isEditing ? "Editando seu roteiro salvo" : "Você está conectado"}
      </p>
      <label className="block text-sm font-bold text-ink" htmlFor="itinerary-name">
        Dê um nome ao seu roteiro (opcional)
      </label>
      <input
        id="itinerary-name"
        type="text"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Ex.: Nossos dias em Natal"
        maxLength={80}
        className="mt-2 w-full rounded-2xl border-2 border-transparent bg-white px-4 py-3 text-sm font-semibold text-ink shadow-soft outline-none focus:border-sea/40"
      />

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar e gerar link"}
      </button>

      {error ? <p className="mt-3 text-center text-sm font-bold text-coral">{error}</p> : null}
    </div>
  );
}

function ShareLinkReady({
  roteiroName,
  shareUrl,
  whatsappUrl,
  copied,
  onCopy,
  onCreateNew,
}: {
  roteiroName: string | null;
  shareUrl: string;
  whatsappUrl: string;
  copied: boolean;
  onCopy: () => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="mt-7">
      <div className="rounded-2xl bg-sea-soft/60 px-4 py-4 text-center">
        <p className="font-display text-lg font-extrabold text-ink">Roteiro salvo com sucesso ☀️</p>
        {roteiroName ? <p className="mt-0.5 text-sm font-bold text-sea">{roteiroName}</p> : null}
      </div>

      <div className="mt-3 truncate rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink/70 shadow-soft">
        {shareUrl}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCopy}
          className="press inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg"
        >
          {copied ? <Check size={16} className="text-sea" /> : <Copy size={16} />}
          {copied ? "Link copiado!" : "Copiar link"}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
        >
          <MessageCircle size={16} /> Compartilhar no WhatsApp
        </a>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/meu-roteiro"
          className="press inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg"
        >
          <Pencil size={15} /> Editar roteiro
        </Link>
        <button
          type="button"
          onClick={onCreateNew}
          className="press inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg"
        >
          <Plus size={15} /> Criar novo roteiro
        </button>
      </div>

      <Link
        to="/meus-roteiros"
        className="mt-4 block text-center text-sm font-bold text-sea hover:text-coral"
      >
        Ver todos os meus roteiros
      </Link>
    </div>
  );
}

function LoginPanel({ placeCount }: { placeCount: number }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setEmailNotice(null);
    setConnecting(true);
    try {
      // Guarda a intenção de compartilhar para retomar o fluxo ao voltar do Google.
      setShareIntent();
      // Redireciona para o Google; ao voltar, a sessão é detectada e o roteiro
      // local (localStorage) continua intacto para salvar.
      await signInWithGoogle("/compartilhar");
    } catch (googleError) {
      if (import.meta.env.DEV) console.error("Falha no login com Google:", googleError);
      setError("Não conseguimos concluir o login com Google agora. Tente novamente em instantes.");
      setConnecting(false);
    }
  };

  return (
    <div className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-sand-soft via-white to-sea-soft/40 p-6 text-center shadow-soft md:p-8">
      <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sun/30 blur-2xl" />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-soft">
          ☀️
        </div>
        <h2 className="mt-4 font-display text-xl font-extrabold text-ink">
          Salve seu roteiro antes de compartilhar
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/65">
          Entre com Google para manter seu roteiro seguro e gerar um link para enviar para quem vai
          viajar com você.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={connecting}
          className="press mx-auto mt-6 inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-ink shadow-soft ring-1 ring-ink/10 hover:shadow-soft-lg disabled:opacity-60"
        >
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <GoogleGlyph />}
          {connecting ? "Conectando..." : "Continuar com Google"}
        </button>

        <p className="mt-3 text-xs font-semibold text-ink/55">
          Seu roteiro atual ({placeCount} {placeCount === 1 ? "lugar" : "lugares"}) será mantido
          depois do login.
        </p>

        <div className="mt-5 flex flex-col items-center gap-2">
          <Link to="/roteiro" className="text-sm font-bold text-sea hover:text-coral">
            Agora não, continuar explorando
          </Link>
          <button
            type="button"
            onClick={() =>
              setEmailNotice(
                "Login por e-mail ficará disponível em breve. Por enquanto, use Google para salvar e compartilhar seu roteiro.",
              )
            }
            className="text-xs font-semibold text-ink/40 underline-offset-2 hover:underline"
          >
            Entrar com e-mail
          </button>
        </div>

        {emailNotice ? (
          <p className="mx-auto mt-3 max-w-sm text-sm font-semibold text-ink/60">{emailNotice}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm font-bold text-coral">{error}</p> : null}
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C39.8 36.7 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function EmptyShare() {
  return (
    <div className="mt-12 rounded-3xl bg-white/80 px-6 py-14 text-center shadow-soft backdrop-blur animate-fade-up">
      <p className="text-base font-bold text-ink">
        Você ainda não escolheu lugares para compartilhar.
      </p>
      <Link
        to="/roteiro"
        className="press mt-6 inline-flex items-center justify-center rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
      >
        Explorar lugares
      </Link>
    </div>
  );
}
