import type { PublishedPlace } from "@/lib/supabase/places";

/** Região exibível, com fallback neutro (nunca inventa localização). */
export function displayRegion(place: PublishedPlace): string {
  return place.region ?? place.locationLabel ?? "Natal e arredores";
}

/** Preço exibível: usa o valor aproximado real; senão o nível; senão texto neutro. */
export function displayPrice(place: PublishedPlace): string {
  if (place.approximatePrice) return place.approximatePrice;
  if (place.priceLevel && place.priceLevel !== "unknown") return formatPriceLevel(place.priceLevel);
  return "Preço a confirmar";
}

export function formatPriceLevel(priceLevel: string): string {
  switch (priceLevel) {
    case "free":
      return "Gratuito";
    case "cheap":
      return "Barato";
    case "medium":
      return "Custo médio";
    case "expensive":
      return "Mais alto";
    default:
      return "Preço a confirmar";
  }
}

/** "Dica do Sol": melhor horário real, sem inventar nada. Null se não houver. */
export function sunTip(place: PublishedPlace): string | null {
  return place.bestTime ?? null;
}
