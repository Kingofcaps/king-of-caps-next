const COLOR_VARIANTS = {
  rouge: ["rouge", "rouges"],
  noir: ["noir", "noire", "noirs", "noires"],
  blanc: ["blanc", "blanche", "blancs", "blanches"],
  bleu: ["bleu", "bleue", "bleus", "bleues"],
  vert: ["vert", "verte", "verts", "vertes"],
  jaune: ["jaune", "jaunes"],
  gris: ["gris", "grise", "grises"],
  beige: ["beige", "beiges"],
  marron: ["marron", "marrons"],
  rose: ["rose", "roses"],
  violet: ["violet", "violette", "violets", "violettes"],
  orange: ["orange", "oranges"],
  bordeaux: ["bordeaux"],
} as const;

const COLOR_CANONICAL_BY_VARIANT = new Map<string, keyof typeof COLOR_VARIANTS>(
  Object.entries(COLOR_VARIANTS).flatMap(([canonical, variants]) => (
    variants.map((variant) => [variant, canonical as keyof typeof COLOR_VARIANTS])
  )),
);

const UNKNOWN_BRANDS = new Set([
  "inconnue",
  "inconnu",
  "unknown",
  "non identifiee",
  "non identifie",
  "n a",
  "na",
]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanRemainingSeparators(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,;/])/g, "$1")
    .replace(/(?:\s*[,;/\-–—]\s*){2,}/g, " ")
    .replace(/^[\s,;:/\-–—]+|[\s,;:/\-–—]+$/g, "")
    .trim();
}

export function removeDetectedColorsFromName(suggestedName: string, detectedColor: string) {
  const detectedColors = new Set<keyof typeof COLOR_VARIANTS>();

  for (const word of normalize(detectedColor).match(/[\p{L}]+/gu) ?? []) {
    const canonical = COLOR_CANONICAL_BY_VARIANT.get(word);
    if (canonical) detectedColors.add(canonical);
  }

  if (detectedColors.size === 0) return suggestedName.trim();

  const detectedVariants = [...detectedColors]
    .flatMap((color) => COLOR_VARIANTS[color])
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  const colorWord = `(?:${detectedVariants})`;
  const separator = String.raw`(?:\s*(?:,|\/|[-–—]|et)\s*)`;
  const detectedColorSequence = new RegExp(
    String.raw`(?<!\p{L})${colorWord}(?:${separator}${colorWord})*(?!\p{L})`,
    "giu",
  );

  return cleanRemainingSeparators(suggestedName.replace(detectedColorSequence, " "));
}

export function cleanAnalyzedBrand(brand: string) {
  const trimmedBrand = brand.trim();
  const normalizedBrand = normalize(trimmedBrand).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return UNKNOWN_BRANDS.has(normalizedBrand) ? "" : trimmedBrand;
}
