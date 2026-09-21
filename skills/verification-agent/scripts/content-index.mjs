#!/usr/bin/env node
// content-index.mjs -- build and query an identifier-independent content index.
//
//   node content-index.mjs build  --corpus hadith-api-book --locator edition=ara-bukhari
//   node content-index.mjs query  --index <path> --probe "..." [--profile arabic] [--min 20]
//   node content-index.mjs find   --corpus hadith-api-book --locator edition=ara-bukhari --probe "..."
//
// Use this whenever the second source does not share the first source's numbering -- which is
// the normal case. `find` reports which items of the corpus actually contain the text; the
// identifier printed beside a match is the corpus's own, and is the one you must cite for it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolveCorpusSpec, loadCorpus, queryCorpus } from './lib/corpus.mjs';
import { PROFILES } from './lib/normalize.mjs';
import { readJson, readJsonl } from './lib/io.mjs';

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes('--' + name);

function parsePairs() {
  const out = {};
  for (const a of args.slice(1)) {
    if (a.startsWith('--')) continue;
    const m = a.match(/^([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function readProbe() {
  const p = flag('probe');
  if (!p) { console.error('--probe is required'); process.exit(2); }
  return p.startsWith('@') ? readFileSync(p.slice(1), 'utf8').trim() : p;
}

function specFor() {
  const ref = flag('corpus');
  if (!ref) { console.error('--corpus is required'); process.exit(2); }
  return resolveCorpusSpec(existsSync(ref) ? readJson(ref, 'corpus spec') : ref);
}

const profile = flag('profile');
const minProbe = Number(flag('min', 20));

if (cmd === 'build') {
  const spec = specFor();
  const locator = parsePairs();
  const { entries, path, fromCache, url, fetchedVia } = await loadCorpus(spec, locator, {
    rebuild: has('rebuild'),
    storeText: !has('no-store-text'),
  });
  console.log(`${fromCache ? 'reused' : 'built'} index: ${path}`);
  console.log(`  items: ${entries.length}`);
  if (url) console.log(`  source: ${url}${fetchedVia ? ` (via ${fetchedVia})` : ''}`);
  console.log(`  profile: ${spec.profile ?? 'unicode'}`);

} else if (cmd === 'query') {
  const indexPath = flag('index');
  if (!indexPath || !existsSync(indexPath)) { console.error('--index <path> is required and must exist'); process.exit(2); }
  const entries = readJsonl(indexPath);
  const probe = readProbe();
  const hits = queryCorpus(entries, probe, profile ?? 'unicode', { minProbe });
  console.log(`${hits.length} match(es) of ${entries.length} items`);
  for (const h of hits) console.log(`  id=${h.id}  (${h.norm.length} normalised chars)`);

} else if (cmd === 'find') {
  const spec = specFor();
  const locator = parsePairs();
  const probe = readProbe();
  const { entries, path, fromCache } = await loadCorpus(spec, locator, { rebuild: has('rebuild') });
  const hits = queryCorpus(entries, probe, profile ?? spec.profile ?? 'unicode', { minProbe });
  console.log(`${hits.length} match(es) in ${path}${fromCache ? ' (cached)' : ''}`);
  for (const h of hits) console.log(`  id=${h.id}`);
  if (hits.length > 5) {
    console.log('');
    console.log(`  WARNING: ${hits.length} matches is implausibly high for a distinctive passage.`);
    console.log('  The probe most likely comes from shared apparatus -- a citation chain (isnad), a');
    console.log('  boilerplate formula, a headnote, a legal maxim -- rather than from the content you');
    console.log('  mean to identify. Re-probe with text unique to the passage.');
  } else if (hits.length === 0) {
    console.log('  No match. The text may be absent from this corpus; or the probe spans a');
    console.log('  divergence between the two sources (try a shorter, more central span); or the');
    console.log('  wrong corpus edition was loaded.');
  }

} else {
  console.log('usage:');
  console.log('  content-index.mjs build --corpus <id|spec.json> [k=v ...] [--rebuild] [--no-store-text]');
  console.log('  content-index.mjs query --index <path> --probe <text|@file> [--profile p] [--min n]');
  console.log('  content-index.mjs find  --corpus <id|spec.json> [k=v ...] --probe <text|@file> [--profile p]');
  console.log('\nprofiles: ' + Object.keys(PROFILES).join(', '));
  process.exit(cmd ? 2 : 0);
}
