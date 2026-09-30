// corpus.mjs -- identifier-independent lookup over a whole dataset.
//
// Why this exists: two sources that carry "the same" item routinely number it differently.
// A verification that matches by number will confirm the wrong text and report success.
// The fix is to download the second source in bulk, normalise every item, and search by
// content -- then read the identifier off whatever matched.
//
// Building the index costs one download per dataset and is cached to disk, so repeated
// lookups are free.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { UA, normalize } from './normalize.mjs';
import { findByContent } from './match.mjs';
import { fetchText, resolveTemplate, getPath, BUILTIN_CORPORA } from './providers.mjs';
import { readJsonl } from './io.mjs';

const DEFAULT_CACHE = join(process.env.TMPDIR || process.env.TEMP || '/tmp', 'verification-agent-cache');

function cachePathFor(spec, locator, cacheDir) {
  const key = resolveTemplate(spec.url, locator).replace(/[^A-Za-z0-9]+/g, '_').slice(-120);
  return join(cacheDir, key + '.jsonl');
}

/**
 * Load a corpus, building a normalised content index if not already cached.
 * @param {object} spec   a corpus spec: {url, array, id, text, profile}
 * @param {object} locator  parameters for the spec's url template
 * @returns {Promise<{entries:Array<{id:any,norm:string,text?:string}>, path:string, fromCache:boolean, profile:string}>}
 */
export async function loadCorpus(spec, locator = {}, { cacheDir = DEFAULT_CACHE, rebuild = false, storeText = true } = {}) {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  const path = cachePathFor(spec, locator, cacheDir);
  const profile = spec.profile ?? 'unicode';

  if (!rebuild && existsSync(path) && statSync(path).size > 0) {
    const entries = readJsonl(path);
    return { entries, path, fromCache: true, profile };
  }

  const url = resolveTemplate(spec.url, locator);
  const { body, via } = await fetchText(url, { 'User-Agent': UA, Accept: '*/*' });
  const root = JSON.parse(body);
  const arr = getPath(root, spec.array);
  if (!Array.isArray(arr)) throw new Error(`corpus array "${spec.array}" not found at ${url}`);

  const entries = arr.map((item) => {
    const text = getPath(item, spec.text) ?? '';
    const e = { id: getPath(item, spec.id), norm: normalize(text, profile) };
    if (storeText) e.text = text;
    return e;
  });

  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return { entries, path, fromCache: false, profile, fetchedVia: via, url };
}

/** Search a loaded corpus for a probe. Returns the matching entries (with their own ids). */
export function queryCorpus(entries, probe, profile = 'unicode', opts = {}) {
  return findByContent(entries, probe, { profile, ...opts });
}

export function resolveCorpusSpec(nameOrSpec) {
  if (typeof nameOrSpec === 'string') {
    const spec = BUILTIN_CORPORA[nameOrSpec];
    if (!spec) throw new Error(`unknown corpus "${nameOrSpec}" (have: ${Object.keys(BUILTIN_CORPORA).join(', ')})`);
    return spec;
  }
  return nameOrSpec;
}

export { DEFAULT_CACHE, dirname };
