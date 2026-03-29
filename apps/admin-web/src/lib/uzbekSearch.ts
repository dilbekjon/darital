// Minimal, search-friendly normalization for Uzbek text:
// - lowercases
// - normalizes apostrophes
// - transliterates Uzbek Cyrillic -> Latin
// - strips punctuation and collapses whitespace
//
// Goal: searching in кирилл or lotin finds the same records.

const CYR_TO_LAT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ғ: "g'",
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  қ: 'q',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ҳ: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: "o'",
  // some keyboards use this for "g'" / "o'"
  ј: 'j',
};

const APOSTROPHES = /[ʼ’ʻ`´ʹꞌ]/g;

export function normalizeUzbekSearch(input: string): string {
  if (!input) return '';

  let s = input.toLowerCase().replace(APOSTROPHES, "'");

  // Normalize common Latin variants.
  // gʻ/oʻ => g'/o'
  s = s.replace(/gʻ/g, "g'").replace(/oʻ/g, "o'");

  // Transliterate Cyrillic -> Latin (best-effort).
  let out = '';
  for (const ch of s) {
    out += CYR_TO_LAT[ch] ?? ch;
  }

  // For search, ignore apostrophes and punctuation to be forgiving.
  out = out
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return out;
}

