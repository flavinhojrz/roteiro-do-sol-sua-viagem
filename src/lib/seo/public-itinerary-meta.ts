import { safeHttpsUrl } from "@/lib/security/validation";
import type { PublicItinerary } from "@/lib/supabase/itineraries";

/** Imagem padrão do Roteiro do Sol (foto real de Natal), servida de /public. */
const DEFAULT_OG_IMAGE_PATH = "/og-default.jpg";
const SITE_NAME = "Roteiro do Sol";
/** Dimensões recomendadas para preview (Open Graph / Twitter summary_large_image). */
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export type PublicItineraryMeta = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogUrl: string;
};

/** Garante uma URL absoluta a partir de um caminho relativo ou de uma URL já absoluta. */
function toAbsoluteUrl(value: string, origin: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (!origin) return value;
  return `${origin.replace(/\/$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
}

/**
 * As capas dos lugares são .webp, formato que WhatsApp/Facebook/iMessage NÃO
 * renderizam em preview de link. Convertemos a imagem real para JPEG 1200x630
 * via images.weserv.nl (proxy público de imagens) — sem reupload nem mexer no
 * banco. A foto continua sendo a real do lugar, apenas reembalada em JPEG.
 * JPEG/PNG já compatíveis são usados direto.
 */
function toShareableJpeg(url: string): string {
  if (/\.(jpe?g|png)(\?|$)/i.test(url)) return url;
  const src = encodeURIComponent(url.replace(/^https?:\/\//i, ""));
  return `https://images.weserv.nl/?url=${src}&w=${OG_IMAGE_WIDTH}&h=${OG_IMAGE_HEIGHT}&fit=cover&output=jpg&q=82`;
}

/**
 * Escolhe a imagem de capa do roteiro seguindo a prioridade:
 *   1. imagem do primeiro lugar do roteiro (melhor posição) que tenha capa;
 *   2. fallback padrão do Roteiro do Sol.
 * Só aceita URLs HTTPS públicas — nunca imagens fake/IA. A imagem é sempre
 * entregue em JPEG para o preview funcionar em todas as redes.
 */
export function pickItineraryOgImage(itinerary: PublicItinerary | null, origin: string): string {
  const fromPlace = itinerary?.places
    .map((place) => safeHttpsUrl(place.coverImageUrl))
    .find((url): url is string => Boolean(url));

  return fromPlace ? toShareableJpeg(fromPlace) : toAbsoluteUrl(DEFAULT_OG_IMAGE_PATH, origin);
}

/** Monta título, descrição e URLs absolutas do roteiro público para SEO/preview. */
export function buildPublicItineraryMeta(
  itinerary: PublicItinerary | null,
  slug: string,
  origin: string,
): PublicItineraryMeta {
  const name = itinerary?.name?.trim();
  const title = name ? `Roteiro de ${name} em Natal ☀️` : "Roteiro em Natal ☀️";
  const description = "Veja os lugares escolhidos nesse roteiro personalizado pelo Roteiro do Sol.";

  return {
    title,
    description,
    canonicalUrl: toAbsoluteUrl(`/r/${slug}`, origin),
    ogUrl: toAbsoluteUrl(`/r/${slug}`, origin),
    ogImage: pickItineraryOgImage(itinerary, origin),
  };
}

/** Tags <meta>/<title> no formato esperado pelo `head` do TanStack Router. */
export function publicItineraryHeadMeta(meta: PublicItineraryMeta, indexable: boolean) {
  return [
    { title: meta.title },
    { name: "description", content: meta.description },
    {
      name: "robots",
      content: indexable ? "index, follow" : "noindex, nofollow",
    },
    // Open Graph (WhatsApp, Telegram, Facebook, Instagram...)
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: "website" },
    { property: "og:title", content: meta.title },
    { property: "og:description", content: meta.description },
    { property: "og:url", content: meta.ogUrl },
    { property: "og:image", content: meta.ogImage },
    { property: "og:image:secure_url", content: meta.ogImage },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
    { property: "og:image:alt", content: meta.title },
    // Twitter / X
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: meta.title },
    { name: "twitter:description", content: meta.description },
    { name: "twitter:image", content: meta.ogImage },
  ];
}

/** Link canônico no formato esperado pelo `head` do TanStack Router. */
export function publicItineraryHeadLinks(meta: PublicItineraryMeta) {
  return [{ rel: "canonical", href: meta.canonicalUrl }];
}
