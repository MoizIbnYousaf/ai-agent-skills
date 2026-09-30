// providers.mjs -- the source registry.
//
// A provider is a small declarative description of how to ask one source for one thing and
// where the text sits in the answer. Nothing here is domain-specific: the same three modes
// (json / html / text) cover REST APIs, scraped pages, and plain-text endpoints, which is
// most of what verification ever needs.
//
// Adding a source is meant to be cheap. If you can describe the URL and point at the field,
// you have a provider. Write code only when the source genuinely resists description.
//
// Built-ins below are real, working providers -- including the scripture tier used to build
// an academic report on the second coming of ʿĪsā -- but they are examples of the pattern,
// not the pattern's limit.

import { execFileSync } from 'node:child_process';
import { UA, clean } from './normalize.mjs';

// ---- tiny helpers -----------------------------------------------------------------------

/** Resolve {placeholders} from the locator. `{x|url}` percent-encodes. */
export function resolveTemplate(tpl, params = {}) {
  return String(tpl).replace(/\{([^}]+)\}/g, (_, expr) => {
    const [key, mode] = expr.split('|').map((s) => s.trim());
    const v = params[key];
    if (v === undefined || v === null) throw new Error(`missing locator parameter "${key}" for template "${tpl}"`);
    return mode === 'url' ? encodeURIComponent(String(v)) : String(v);
  });
}

/** Read `a.b[0].c` out of a parsed object. Returns undefined rather than throwing. */
export function getPath(obj, path) {
  if (!path) return obj;
  let cur = obj;
  for (const raw of String(path).split('.')) {
    if (cur === undefined || cur === null) return undefined;
    const m = raw.match(/^([^[\]]*)((\[\d+\])*)$/);
    if (!m) return undefined;
    if (m[1]) cur = cur[m[1]];
    for (const idx of m[2].match(/\d+/g) ?? []) cur = cur?.[Number(idx)];
  }
  return cur;
}

function applyWhere(arr, where, params) {
  if (!where) return arr;
  const tests = Object.entries(where).map(([k, v]) => [k, resolveTemplate(String(v), params)]);
  return arr.filter((item) => tests.every(([k, v]) => String(getPath(item, k)) === v));
}

// ---- fetch ------------------------------------------------------------------------------

/**
 * Fetch a URL. Some hosts reject library HTTP clients while serving browsers normally, so
 * a curl fallback is attempted once on 403/406/429 or a transport error. This is a real and
 * common failure mode, not defensive padding.
 */
export async function fetchText(url, headers = {}, { curlFallback = true, timeoutMs = 60000 } = {}) {
  const h = { 'User-Agent': UA, Accept: '*/*', ...headers };
  let via = 'fetch';
  try {
    const ctl = AbortSignal.timeout(timeoutMs);
    const res = await fetch(url, { headers: h, signal: ctl, redirect: 'follow' });
    if (res.ok) return { body: await res.text(), status: res.status, url, via };
    if (![403, 406, 429].includes(res.status) || !curlFallback) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    via = `curl (fetch returned ${res.status})`;
  } catch (err) {
    if (!curlFallback) throw err;
    via = `curl (fetch failed: ${err.message})`;
  }

  const bin = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const args = ['-sSL', '--max-time', String(Math.round(timeoutMs / 1000))];
  for (const [k, v] of Object.entries(h)) args.push('-H', `${k}: ${v}`);
  args.push(url);
  try {
    const body = execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (!body) throw new Error('empty response');
    return { body, status: 200, url, via };
  } catch (err) {
    throw new Error(`both fetch and curl failed for ${url}: ${err.message}`);
  }
}

// ---- extraction -------------------------------------------------------------------------

/**
 * Run a provider's field specs against a fetched body.
 * A spec is either:
 *   JSON  { as, array?, where?, value?, path? }
 *   HTML  { as, regex, group?, flags?, longest?, all? }
 */
function extractFields(provider, body, params) {
  const out = {};
  for (const spec of provider.extract ?? []) {
    let value;
    if (provider.mode === 'json') {
      const root = JSON.parse(body);
      let node = spec.array ? getPath(root, spec.array) : getPath(root, spec.path ?? '');
      if (Array.isArray(node)) {
        node = applyWhere(node, spec.where, params);
        node = spec.value ? getPath(node[0], spec.value) : node[0];
      }
      value = node;
    } else {
      const flags = spec.flags ?? '';
      const re = new RegExp(spec.regex, spec.all ? flags : (flags.includes('g') ? flags : flags + ''));
      if (spec.all) {
        value = [...body.matchAll(new RegExp(spec.regex, flags.includes('g') ? flags : flags + 'g'))]
          .map((m) => m[spec.group ?? 1]);
      } else {
        const m = body.match(re);
        value = m ? m[spec.group ?? 1] : undefined;
      }
      if (spec.longest && Array.isArray(value)) {
        value = value.map(clean).sort((a, b) => b.length - a.length)[0];
      }
    }
    out[spec.as] = Array.isArray(value) ? value.map(clean) : clean(value);
  }
  return out;
}

// ---- public API -------------------------------------------------------------------------

export class Registry {
  constructor(providers = {}) { this.providers = { ...BUILTIN_PROVIDERS, ...providers }; }
  get(id) {
    const p = this.providers[id];
    if (!p) throw new Error(`unknown provider "${id}" (have: ${Object.keys(this.providers).join(', ')})`);
    return p;
  }
  ids() { return Object.keys(this.providers); }

  /** Fetch + extract one reference. Returns a field map plus retrieval provenance. */
  async retrieve(id, locator = {}, { curlFallback = true, includeRaw = false } = {}) {
    const p = this.get(id);
    const url = resolveTemplate(p.url, locator);
    const params = { ...locator };
    const { body, status, via } = await fetchText(url, p.headers, { curlFallback });
    const fields = extractFields(p, body, params);
    return {
      provider: id,
      url,
      httpStatus: status,
      fetchedVia: via,
      fetchedUtc: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      fieldNames: Object.keys(fields),
      ...fields,
      ...(includeRaw ? { _raw: body } : {}),
    };
  }
}

// ---- built-ins --------------------------------------------------------------------------
// Grouped by source type so the pattern is legible. Copy the nearest one and edit.

export const BUILTIN_PROVIDERS = {
  // ===== Scripture: Qur'an (REST/JSON) ===================================================
  'quran-uthmani': {
    description: "Qur'anic text, Uthmani script, fully vocalised (Quran.com v4)",
    mode: 'json',
    url: 'https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number={surah}',
    extract: [{ as: 'text', array: 'verses', where: { verse_key: '{surah}:{ayah}' }, value: 'text_uthmani' }],
    profile: 'arabic',
  },
  'quran-translation': {
    description: 'Published Qur’an translation by resource id (20 Saheeh Intl, 85 Abdel Haleem, 84 Usmani, 19 Pickthall, 22 Yusuf Ali)',
    mode: 'json',
    url: 'https://api.quran.com/api/v4/quran/translations/{translation}?verse_key={surah}:{ayah}',
    extract: [
      { as: 'text', array: 'translations', value: 'text' },
      // The translator's name sits in `meta`, not on the translation object.
      { as: 'translator', path: 'meta.translation_name' },
      { as: 'translatorAuthor', path: 'meta.author_name' },
    ],
    profile: 'latin',
  },
  'quran-tafsir': {
    description: 'Classical commentary by resource id (169 Ibn Kathir EN abridged, 15 al-Ṭabarī AR, 90 al-Qurṭubī AR, 14 Ibn Kathīr AR)',
    mode: 'json',
    url: 'https://api.quran.com/api/v4/tafsirs/{tafsir}/by_ayah/{surah}:{ayah}',
    extract: [{ as: 'text', path: 'tafsir.text' }, { as: 'work', path: 'tafsir.resource_name' }],
    profile: 'arabic',
  },

  // ===== Scripture: hadith (HTML scrape, browser headers required) =======================
  sunnah: {
    description: 'Hadith text, English rendering and published grading (sunnah.com). Locator: {path} = "bukhari:3448" or "malik/56/4"',
    mode: 'html',
    url: 'https://sunnah.com/{path}',
    headers: { 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html,application/xhtml+xml' },
    extract: [
      { as: 'text', regex: '<div class="arabic_hadith_full[^"]*">([\\s\\S]*?)</div>', group: 1 },
      // English must be bounded on BOTH sides; a bare non-greedy match runs into the Arabic block.
      {
        as: 'english',
        regex:
          '<div class="english_hadith_full">([\\s\\S]*?)(?=<div class="arabic_hadith_full|<div class=hadith_annotation|<table class=hadith_reference|<div class=bottomItems)',
        group: 1,
      },
      // Two cells carry the grade class: a "Grade:" label and the value. Take the longest.
      { as: 'grade', regex: '<td[^>]*class=["\']?[^"\'>]*english_grade[^"\'>]*["\']?[^>]*>([\\s\\S]*?)</td>', group: 1, all: true, longest: true },
      { as: 'gradeVerbatim', regex: '<td[^>]*class=["\']?[^"\'>]*arabic_grade[^"\'>]*["\']?[^>]*>([\\s\\S]*?)</td>', group: 1, all: true, longest: true },
    ],
    profile: 'arabic',
  },
  'hadith-api-record': {
    description: 'Single hadith record from the hadith-api corpus (independent mirror). Locator: {edition} e.g. "ara-bukhari", {number}',
    mode: 'json',
    url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{edition}/{number}.json',
    extract: [{ as: 'text', path: 'hadiths[0].text' }],
    profile: 'arabic',
  },

  // ===== Bibliography ====================================================================
  'openlibrary-search': {
    description: 'Bibliographic metadata by title/author query (OpenLibrary)',
    mode: 'json',
    url: 'https://openlibrary.org/search.json?q={query|url}&limit={limit}&fields=title,author_name,first_publish_year,publisher,isbn,key,edition_count',
    extract: [
      { as: 'text', array: 'docs', value: 'title' },
      { as: 'authors', array: 'docs', value: 'author_name' },
      { as: 'year', array: 'docs', value: 'first_publish_year' },
      { as: 'publisher', array: 'docs', value: 'publisher' },
      { as: 'key', array: 'docs', value: 'key' },
    ],
    profile: 'latin',
  },
  'crossref-doi': {
    description: 'Journal article / book metadata by DOI (Crossref)',
    mode: 'json',
    url: 'https://api.crossref.org/works/{doi|url}',
    headers: { Accept: 'application/json' },
    extract: [
      { as: 'text', path: 'message.title[0]' },
      { as: 'container', path: 'message.container-title[0]' },
      { as: 'year', path: 'message.issued.date-parts[0][0]' },
      { as: 'publisher', path: 'message.publisher' },
    ],
    profile: 'latin',
  },

  // ===== Reference works and general web ================================================
  'wikipedia-summary': {
    description: 'Encyclopaedia summary (Wikipedia REST). Locator: {lang} (default en), {title}',
    mode: 'json',
    url: 'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title|url}',
    extract: [{ as: 'text', path: 'extract' }, { as: 'title', path: 'title' }],
    profile: 'latin',
  },
  'generic-json': {
    description: 'Any JSON endpoint. Locator supplies URL parameters; edit `extract` for the field.',
    mode: 'json',
    url: '{url}',
    extract: [{ as: 'text', path: '{path}' }],
    profile: 'unicode',
  },
  'generic-html': {
    description: 'Any HTML page. Locator supplies {url}; `extract.regex` must have one capture group.',
    mode: 'html',
    url: '{url}',
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    extract: [{ as: 'text', regex: '{regex}', group: 1 }],
    profile: 'unicode',
  },
};

// ---- corpus specs (for identifier-independent lookup) -----------------------------------
// A corpus is a whole downloaded dataset plus the pointers needed to index it by content.
// Use when a second source does not share the first source's numbering -- which is the norm.

export const BUILTIN_CORPORA = {
  'hadith-api-book': {
    description: 'Whole book of the hadith-api corpus, indexed by content',
    url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{edition}.min.json',
    array: 'hadiths',
    id: 'hadithnumber',
    text: 'text',
    profile: 'arabic',
  },
};
