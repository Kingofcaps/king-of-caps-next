export const SITE_NAME = "KING OF CAPS";
export const SITE_URL = "https://kingofcaps.bj";
export const SITE_DESCRIPTION = "Découvrez des casquettes authentiques sélectionnées par KING OF CAPS, disponibles à Cotonou avec livraison partout au Bénin.";

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function seoDescription(description: string, fallback: string) {
  const value = description.trim() || fallback;
  return value.length <= 160 ? value : `${value.slice(0, 157).trimEnd()}…`;
}
