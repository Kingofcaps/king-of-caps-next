const COLOR_WORDS: Record<string, string> = {
  noir: "noir",
  noire: "noir",
  noirs: "noir",
  noires: "noir",
  blanc: "blanc",
  blanche: "blanc",
  blancs: "blanc",
  blanches: "blanc",
  rouge: "rouge",
  rouges: "rouge",
  bleu: "bleu",
  bleue: "bleu",
  bleus: "bleu",
  bleues: "bleu",
  vert: "vert",
  verte: "vert",
  verts: "vert",
  vertes: "vert",
  jaune: "jaune",
  jaunes: "jaune",
  orange: "orange",
  oranges: "orange",
  rose: "rose",
  roses: "rose",
  violet: "violet",
  violette: "violet",
  violets: "violet",
  violettes: "violet",
  gris: "gris",
  grise: "gris",
  grises: "gris",
  marron: "marron",
  marrons: "marron",
  beige: "beige",
  beiges: "beige",
  kaki: "kaki",
  kakis: "kaki",
  creme: "creme",
  dore: "dore",
  doree: "dore",
  dores: "dore",
  dorees: "dore",
  argente: "argente",
  argentee: "argente",
  argentes: "argente",
  argentees: "argente",
  bordeaux: "bordeaux",
  turquoise: "turquoise",
  turquoises: "turquoise",
  multicolore: "multicolore",
  multicolores: "multicolore",
};

const COLOR_CONNECTORS = new Set(["et", "ou", "avec", "and"]);
const GENERIC_PRODUCT_WORDS = new Set(["casquette", "cap"]);

type WordPart = {
  canonicalColor?: string;
  end: number;
  normalized: string;
  start: number;
};

function normalizeWord(word: string) {
  return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function wordsIn(value: string): WordPart[] {
  return [...value.matchAll(/[\p{L}]+/gu)].map((match) => {
    const normalized = normalizeWord(match[0]);
    const start = match.index;
    return {
      canonicalColor: COLOR_WORDS[normalized],
      end: start + match[0].length,
      normalized,
      start,
    };
  });
}

function colorSet(value: string) {
  return new Set(wordsIn(value).flatMap((word) => word.canonicalColor ? [word.canonicalColor] : []));
}

function sameColors(left: Set<string>, right: Set<string>) {
  return left.size === right.size && [...left].every((color) => right.has(color));
}

function tidyName(value: string) {
  return value
    .replace(/\s+([,;/])/g, "$1")
    .replace(/([,;/]){2,}/g, "$1")
    .replace(/^[\s,;:/\-–—]+|[\s,;:/\-–—]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanSuggestedProductName(suggestedName: string, color: string) {
  const name = suggestedName.trim();
  if (!name) return "";

  const nameWords = wordsIn(name);
  const expectedColors = colorSet(color);
  const nonColorWords = nameWords.filter((word) => !word.canonicalColor && !COLOR_CONNECTORS.has(word.normalized));

  if (nonColorWords.length === 0 && nameWords.some((word) => word.canonicalColor)) return "";
  if (color.trim() && normalizeWord(name) === normalizeWord(color.trim())) return "";
  if (expectedColors.size === 0) return name;

  const colorRuns: Array<{ colors: Set<string>; endWord: number; startWord: number }> = [];
  let runStart: number | null = null;
  for (let index = 0; index <= nameWords.length; index += 1) {
    const word = nameWords[index];
    const belongsToColorRun = word && (word.canonicalColor || COLOR_CONNECTORS.has(word.normalized));
    if (belongsToColorRun && runStart === null) runStart = index;
    if ((!belongsToColorRun || index === nameWords.length) && runStart !== null) {
      const endWord = index - 1;
      const colors = new Set(
        nameWords.slice(runStart, endWord + 1).flatMap((part) => part.canonicalColor ? [part.canonicalColor] : []),
      );
      if (colors.size > 0) colorRuns.push({ colors, endWord, startWord: runStart });
      runStart = null;
    }
  }

  const removableRun = colorRuns.find((run) => {
    if (!sameColors(run.colors, expectedColors)) return false;
    const isAtEdge = run.startWord === 0 || run.endWord === nameWords.length - 1;
    const followsGenericProduct = run.startWord > 0
      && GENERIC_PRODUCT_WORDS.has(nameWords[run.startWord - 1].normalized);
    return isAtEdge || followsGenericProduct || run.colors.size > 1;
  });

  if (!removableRun) return name;

  const start = nameWords[removableRun.startWord].start;
  const end = nameWords[removableRun.endWord].end;
  return tidyName(`${name.slice(0, start)} ${name.slice(end)}`);
}
