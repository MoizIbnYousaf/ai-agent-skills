// normalize.mjs -- text normalisation profiles for verification comparison.
//
// The governing principle: two retrievals of the "same" text from different sources will
// differ in ways that are typographically real but evidentially irrelevant -- optional
// marks, letter variants, case, dash and quote style, whitespace. Comparison must be
// invariant to those and to nothing else. Over-normalise and you will confirm a text that
// is not the one you claim; under-normalise and every cross-source check fails.
//
// Two mechanisms, in order:
//   1. GENERIC MARK FOLDING (any script): NFD, drop Unicode Mn (combining marks), NFC.
//      Handles Latin macrons, Arabic harakat, Hebrew niqqud, Greek accents alike.
//   2. SCRIPT FOLDING (per writing system): letter variants that are NOT combining marks
//      and so survive step 1 -- Arabic alef forms, alef maqsura, ta marbuta, tatweel;
//      Greek final sigma. Step 1 cannot do this; it is script knowledge.
//
// Use `diacritic-fold` as the script-agnostic default. Add a script profile only when the
// script has letter-level variants.

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// ---- generic helpers --------------------------------------------------------------------

/** NFD -> strip all combining marks -> NFC. Works for any script with optional marks. */
export function foldMarks(s) {
  return String(s ?? '').normalize('NFD').replace(/\p{Mn}+/gu, '').normalize('NFC');
}

function squashSpace(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function stripTags(s) {
  return String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // Footnote/apparatus markers would otherwise leak digits into the quoted text.
    .replace(/<sup[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/** Context-free cleanup applied to every extraction before any profile runs. */
export function clean(s) {
  return squashSpace(stripTags(s));
}

// ---- profiles ---------------------------------------------------------------------------
// Each profile: text -> comparison key. Keep them pure and deterministic.

const ARABIC_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g; // harakat, Quranic marks, tatweel

export const PROFILES = {
  /** No transformation. Use only when you must match bytes exactly. */
  identity: (s) => String(s ?? ''),

  /** Script-agnostic: Unicode-compose, collapse whitespace, casefold. Safe default. */
  unicode: (s) => squashSpace(String(s ?? '').normalize('NFKC')).toLowerCase(),

  /** Drops all optional marks (macrons, harakat, niqqud, accents) -- any script. */
  'diacritic-fold': (s) => squashSpace(foldMarks(String(s ?? '').normalize('NFKC')).toLowerCase()),

  /**
   * Latin-script prose: case, diacritics, dash/quote style, and the punctuation that
   * differs between publishers. Use for quotations and bibliographic strings.
   */
  latin: (s) =>
    squashSpace(
      foldMarks(String(s ?? '').normalize('NFKC'))
        .toLowerCase()
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/[\u2018\u2019\u02BC\u02BF\u2032]/g, "'")
        .replace(/[\u201C\u201D\u2033]/g, '"')
        .replace(/\u2026/g, '...')
    ),

  /** Latin prose with punctuation removed -- for fuzzy quote matching. */
  'latin-alnum': (s) =>
    PROFILES.latin(s)
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim(),

  /**
   * Arabic: fold marks, then unify letter variants that are not combining marks.
   * alef variants -> alef; alef maqsura -> ya; ta marbuta -> ha; drop tatweel.
   * Restricting to the Arabic block also discards stray Latin/editorial insertions.
   */
  arabic: (s) => {
    let t = foldMarks(String(s ?? '').normalize('NFKC')).replace(ARABIC_MARKS, '');
    t = t.replace(/[\u0622\u0623\u0625\u0627\u0671]/g, '\u0627');
    t = t.replace(/\u0649/g, '\u064A');
    t = t.replace(/\u0629/g, '\u0647');
    t = t.replace(/[^\u0600-\u06FF]/g, '');
    return t;
  },

  /** Hebrew: fold niqqud and te'amim; keep letters. */
  hebrew: (s) =>
    foldMarks(String(s ?? '').normalize('NFKC'))
      .replace(/[\u0591-\u05C7\u05F3\u05F4]/g, '')
      .replace(/[^\u05D0-\u05EA]/g, ''),

  /** Greek: fold accents and normalise final sigma. */
  greek: (s) =>
    foldMarks(String(s ?? '').normalize('NFKC').toLowerCase())
      .replace(/\u03C2/g, '\u03C3')
      .replace(/[^\u03B1-\u03C9]/g, ''),

  /** Numerals and units: for checking a figure appears in a source. */
  numeric: (s) =>
    String(s ?? '')
      .normalize('NFKC')
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .replace(/[,\u066C\u2009\u00A0](?=\d{3}\b)/g, '') // thousands separators
      .replace(/[^\d.\-]/g, ''),
};

export function normalize(s, profile = 'unicode') {
  const fn = PROFILES[profile];
  if (!fn) throw new Error(`unknown normalisation profile: ${profile} (have: ${Object.keys(PROFILES).join(', ')})`);
  return fn(s);
}

// ---- hashing ----------------------------------------------------------------------------

import { createHash } from 'node:crypto';

/** Short, stable content fingerprint. Computed over the text as retrieved. */
export function fingerprint(s, chars = 16) {
  if (!s) return '';
  return createHash('sha256').update(String(s), 'utf8').digest('hex').slice(0, chars);
}
