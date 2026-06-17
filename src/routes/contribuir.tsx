import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Loader2, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StepShell } from "@/components/onboarding/StepShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth/session";
import { isCatalogSlug } from "@/lib/security/validation";
import { ContributionError, submitContribution } from "@/lib/supabase/contributions";
import { getPublishedPlaces } from "@/lib/supabase/places";
import { cn } from "@/lib/utils";

const OTHER = "__other__";
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const Route = createFileRoute("/contribuir")({
  validateSearch: (search: Record<string, unknown>): { place?: string } => ({
    place: isCatalogSlug(search.place) ? search.place : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contribua com a comunidade — Roteiro do Sol" },
      {
        name: "description",
        content:
          "Deixe sua opinião, sugira lugares, conte preços reais e compartilhe fotos de Natal/RN. Anônimo ou com seu nome, você escolhe.",
      },
    ],
  }),
  component: ContribuirPage,
});

function ContribuirPage() {
  const { place: placeSlug } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useSession();

  const { data: places = [] } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });

  const defaultName = useMemo(() => {
    const meta = session?.user?.user_metadata as { full_name?: string; name?: string } | undefined;
    return meta?.full_name ?? meta?.name ?? session?.user?.email?.split("@")[0] ?? "";
  }, [session]);

  const initialPlaceId = useMemo(
    () => (placeSlug ? (places.find((p) => p.slug === placeSlug)?.id ?? "") : ""),
    [placeSlug, places],
  );

  const [placeValue, setPlaceValue] = useState("");
  const [suggestedPlace, setSuggestedPlace] = useState("");
  const [opinion, setOpinion] = useState("");
  const [priceReais, setPriceReais] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [shareName, setShareName] = useState(false);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pré-seleciona o lugar vindo da página dele (quando a lista carregar).
  const resolvedPlace = placeValue || initialPlaceId;
  const isOther = resolvedPlace === OTHER;

  const photoPreviews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos],
  );

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    let rejected = false;

    for (const file of Array.from(list)) {
      if (!ALLOWED_PHOTO_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
        rejected = true;
        continue;
      }
      accepted.push(file);
    }

    if (rejected) {
      toast.error("Algumas fotos foram ignoradas", {
        description: "Use JPG, PNG ou WEBP com no máximo 5 MB por arquivo.",
      });
    }

    setPhotos((prev) => [...prev, ...accepted].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const hasTarget = (resolvedPlace && !isOther) || (isOther && suggestedPlace.trim().length > 0);
  const hasContent = opinion.trim().length > 0 || priceReais.trim().length > 0;
  const canSubmit = consent && hasTarget && hasContent && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitContribution({
        placeId: isOther || !resolvedPlace ? null : resolvedPlace,
        suggestedPlace: isOther ? suggestedPlace : null,
        opinion,
        suggestion: "",
        priceReais: priceReais || null,
        priceNote,
        rating: rating || null,
        displayName: shareName ? name || defaultName : null,
        isAnonymous: !shareName,
        photos,
      });
      toast.success("Contribuição enviada! 🌞", {
        description: "Obrigado! Ela passa por uma revisão rápida antes de aparecer no site.",
      });
      if (placeSlug) {
        navigate({ to: "/lugar/$slug", params: { slug: placeSlug } });
      } else {
        navigate({ to: "/" });
      }
    } catch (error) {
      if (import.meta.env.DEV && error instanceof ContributionError) {
        console.error("Contribuição:", error.technical);
      }
      const message =
        error instanceof ContributionError
          ? error.message
          : "Não conseguimos enviar agora. Tente novamente.";
      toast.error("Algo deu errado", { description: message });
      setSubmitting(false);
    }
  }

  return (
    <StepShell>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-coral"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div className="mt-6 animate-fade-up">
        <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sea backdrop-blur">
          🌴 Sua vez
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink md:text-4xl">
          Conte como foi de verdade
        </h1>
        <p className="mt-3 text-base text-ink/65">
          Sua opinião, preços reais e fotos ajudam outros viajantes. Leva 1 minutinho — e pode ser
          anônimo.
        </p>
      </div>

      <div className="mt-8 space-y-5 animate-fade-up">
        {/* Lugar */}
        <Field label="Sobre qual lugar?">
          <Select value={resolvedPlace} onValueChange={setPlaceValue}>
            <SelectTrigger className="h-12 rounded-2xl bg-white">
              <SelectValue placeholder="Escolha um lugar" />
            </SelectTrigger>
            <SelectContent>
              {places.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER}>Outro lugar (não está na lista)</SelectItem>
            </SelectContent>
          </Select>
          {isOther ? (
            <Input
              value={suggestedPlace}
              onChange={(e) => setSuggestedPlace(e.target.value)}
              placeholder="Nome do lugar que você quer sugerir"
              maxLength={120}
              className="mt-3 h-12 rounded-2xl bg-white"
            />
          ) : null}
        </Field>

        {/* Opinião */}
        <Field label="Sua opinião">
          <Textarea
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="O que você achou? Dicas, melhor horário, o que vale a pena..."
            maxLength={1000}
            rows={4}
            className="rounded-2xl bg-white"
          />
        </Field>

        {/* Preço */}
        <Field label="Preço real" hint="opcional">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-40">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/50">
                R$
              </span>
              <Input
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value.replace(/[^0-9.,]/g, ""))}
                inputMode="decimal"
                placeholder="0,00"
                className="h-12 rounded-2xl bg-white pl-10"
              />
            </div>
            <Input
              value={priceNote}
              onChange={(e) => setPriceNote(e.target.value)}
              placeholder="do quê? (ex.: ingresso, barraca, prato)"
              maxLength={120}
              className="h-12 flex-1 rounded-2xl bg-white"
            />
          </div>
        </Field>

        {/* Nota */}
        <Field label="Sua nota" hint="opcional">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                onClick={() => setRating(rating === value ? 0 : value)}
                className="press p-1"
              >
                <Star
                  size={28}
                  className={cn(
                    "transition-colors",
                    value <= rating ? "fill-sun text-sun" : "text-ink/25",
                  )}
                />
              </button>
            ))}
          </div>
        </Field>

        {/* Fotos */}
        <Field label="Fotos do local" hint="opcional, até 4">
          <div className="flex flex-wrap gap-3">
            {photoPreviews.map((preview, index) => (
              <div key={preview.url} className="relative h-20 w-20 overflow-hidden rounded-2xl">
                <img src={preview.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label="Remover foto"
                  className="absolute right-1 top-1 rounded-full bg-ink/70 p-0.5 text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <label className="press flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/20 bg-white text-ink/50 hover:border-coral hover:text-coral">
                <ImagePlus size={20} />
                <span className="text-[10px] font-bold">Adicionar</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
        </Field>

        {/* Identidade */}
        <div className="rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-sm font-extrabold text-ink">Compartilhar meu nome</p>
              <p className="text-xs text-ink/55">
                Desligado, sua contribuição aparece como <strong>Anônimo</strong>.
              </p>
            </div>
            <Switch checked={shareName} onCheckedChange={setShareName} />
          </div>
          {shareName ? (
            <Input
              value={name || defaultName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como você quer aparecer"
              maxLength={60}
              className="mt-3 h-11 rounded-xl bg-sand-soft"
            />
          ) : null}
        </div>

        {/* Consentimento */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
          <Checkbox
            checked={consent}
            onCheckedChange={(value) => setConsent(value === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-6 text-ink/75">
            Autorizo o Roteiro do Sol a usar e exibir publicamente as informações e fotos que
            enviei.
          </span>
        </label>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="press h-13 w-full rounded-full bg-coral py-6 text-base font-bold text-white shadow-coral hover:shadow-coral-lg disabled:opacity-50"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
          {submitting ? "Enviando..." : "Enviar contribuição"}
        </Button>
        {!consent ? (
          <p className="text-center text-xs text-ink/50">Marque a autorização acima para enviar.</p>
        ) : null}
      </div>
    </StepShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 flex items-baseline gap-2 font-display text-sm font-extrabold text-ink">
        {label}
        {hint ? <span className="text-xs font-semibold text-ink/45">{hint}</span> : null}
      </Label>
      {children}
    </div>
  );
}
