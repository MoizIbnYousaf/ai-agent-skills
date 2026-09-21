#!/usr/bin/env node
// verify.mjs -- run a reference manifest against live sources and emit verification records.
//
//   node verify.mjs --refs refs.json --out ./verification [--providers extra.json]
//                   [--only id1,id2] [--no-curl-fallback] [--rebuild-corpus] [--quiet]
//
// The records are the deliverable. Everything downstream -- the document, the appendix, the
// audit -- is generated FROM them, so the published text is the retrieved text.
//
// Manifest item:
//   {
//     "id": "q-43-61",
//     "label": "Qur'an 43:61",
//     "source": "quran-uthmani",
//     "locator": { "surah": 43, "ayah": 61 },
//     "profile": "arabic",
//     "assert":   { "field": "text", "contains": "..." }        // optional
//     "crossCheck": { "via": "provider", "provider": "x", "locator": {...} }
//                 | { "via": "corpus", "corpus": "id-or-spec", "locator": {...} }
//   }
//
// Statuses:
//   VERIFIED   retrieved and every assertion passed
//   RETRIEVED  retrieved, nothing asserted (the common case for a citation register)
//   MISMATCH   retrieved, but an assertion failed -- investigate before publishing
//   FAILED     could not retrieve; recorded as a failure, never silently dropped

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Registry } from './lib/providers.mjs';
import { compare, isSame } from './lib/match.mjs';
import { normalize, fingerprint, clean } from './lib/normalize.mjs';
import { loadCorpus, resolveCorpusSpec, queryCorpus } from './lib/corpus.mjs';
import { readJson } from './lib/io.mjs';

// ---- args -------------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name, def = undefined) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? (args[i + 1]?.startsWith('--') ? true : args[i + 1]) : def;
};
const has = (name) => args.includes('--' + name);

const refsPath = flag('refs');
const outDir = flag('out', './verification');
if (!refsPath) { console.error('usage: verify.mjs --refs refs.json --out DIR'); process.exit(2); }

const quiet = has('quiet');
const curlFallback = !has('no-curl-fallback');
const rebuild = has('rebuild-corpus');
const only = flag('only') ? String(flag('only')).split(',').map((s) => s.trim()) : null;
const providersFile = flag('providers');
const extraProviders = providersFile ? readJson(providersFile, 'providers file') : {};
const registry = new Registry(extraProviders);

const manifest = (() => {
  try {
    return readJson(refsPath, 'manifest');
  } catch (err) {
    console.error(`cannot read manifest: ${err.message}`);
    console.error('Expected JSON of the form {"refs": [ {"id","source","locator"}, ... ]}. See assets/refs.example.json.');
    process.exit(2);
  }
})();
const refs = (manifest.refs ?? manifest).filter((r) => !only || only.includes(r.id));

const log = (...a) => { if (!quiet) console.log(...a); };

// ---- run --------------------------------------------------------------------------------
const records = [];
for (const ref of refs) {
  const profile = ref.profile ?? 'unicode';
  const rec = {
    id: ref.id,
    label: ref.label ?? '',
    source: ref.source,
    locator: ref.locator ?? {},
    profile,
    notes: ref.notes ?? '',
    fetchedUtc: null,
    url: null,
    fields: {},
    fingerprints: {},
    assertions: [],
    crossCheck: null,
    status: 'FAILED',
    error: null,
  };

  try {
    const got = await registry.retrieve(ref.source, rec.locator, { curlFallback });
    rec.fetchedUtc = got.fetchedUtc;
    rec.url = got.url;
    rec.fetchedVia = got.fetchedVia;
    rec.httpStatus = got.httpStatus;
    for (const k of got.fieldNames) {
      rec.fields[k] = got[k];
      rec.fingerprints[k] = fingerprint(got[k]);
    }

    // assertions
    if (ref.assert) {
      const field = ref.assert.field ?? 'text';
      const actual = rec.fields[field] ?? '';
      if (ref.assert.equals !== undefined) {
        const c = compare(actual, ref.assert.equals, { profile });
        rec.assertions.push({ kind: 'equals', field, pass: isSame(c.verdict), verdict: c.verdict, run: c.run, ratio: c.ratio });
      }
      if (ref.assert.contains !== undefined) {
        const c = compare(actual, ref.assert.contains, { profile });
        // An assertion that "the text contains X" means X occurs in the text -- containment,
        // not merely a strong partial overlap across a long span.
        const pass = ['exact', 'normalized', 'contains'].includes(c.verdict);
        rec.assertions.push({ kind: 'contains', field, expected: ref.assert.contains, pass, verdict: c.verdict, run: c.run, ratio: c.ratio });
      }
    }

    // cross-check against a second source
    if (ref.crossCheck) {
      const cc = ref.crossCheck;
      const probe = rec.fields[cc.field ?? 'text'] ?? '';
      if (cc.via === 'corpus') {
        const spec = resolveCorpusSpec(cc.corpus);
        const { entries, fromCache, path } = await loadCorpus(spec, { ...rec.locator, ...(cc.locator ?? {}) }, { rebuild });
        const hits = queryCorpus(entries, probe, spec.profile ?? profile, { minProbe: cc.minProbe ?? 20 });
        rec.crossCheck = {
          via: 'corpus', corpus: typeof cc.corpus === 'string' ? cc.corpus : spec.url,
          index: path, fromCache, hits: hits.length,
          matchedIds: hits.slice(0, 20).map((h) => h.id),
          verdict: hits.length ? 'INDEPENDENT-CONFIRM' : 'NOT-FOUND-IN-INDEPENDENT-SOURCE',
        };
      } else if (cc.via === 'provider') {
        const other = await registry.retrieve(cc.provider, cc.locator ?? {}, { curlFallback });
        const c = compare(probe, other[cc.field ?? 'text'] ?? '', { profile });
        rec.crossCheck = { via: 'provider', provider: cc.provider, url: other.url, verdict: c.verdict, run: c.run, ratio: c.ratio };
      }
    }

    const failedAssertion = rec.assertions.some((a) => !a.pass);
    const failedCross = rec.crossCheck && ['NOT-FOUND-IN-INDEPENDENT-SOURCE', 'mismatch'].includes(rec.crossCheck.verdict);
    rec.status = failedAssertion || failedCross ? 'MISMATCH' : rec.assertions.length ? 'VERIFIED' : 'RETRIEVED';
    const fields = Object.keys(rec.fields).map((k) => `${k}=${(rec.fields[k] ?? '').length}c`).join(' ');
    const xc = rec.crossCheck ? `  [cross-check: ${rec.crossCheck.verdict}${rec.crossCheck.matchedIds ? ' ids=' + (rec.crossCheck.matchedIds.join(',') || 'none') : ''}]` : '';
    log(`  ${rec.status.padEnd(9)} ${rec.id.padEnd(28)} ${fields}${xc}`);
  } catch (err) {
    rec.status = 'FAILED';
    rec.error = err.message;
    log(`  FAILED    ${rec.id.padEnd(28)} ${err.message}`);
  }
  records.push(rec);
}

// ---- write ------------------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, 'records.json');
writeFileSync(jsonPath, JSON.stringify({
  generated: new Date().toISOString(),
  manifest: refsPath,
  counts: records.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}),
  records,
}, null, 2) + '\n');

// human-readable companion
const md = ['# Verification records', '', `Generated: ${new Date().toISOString()}`, '',
  'Retrieved live. Each record carries its source URL, UTC timestamp and a content fingerprint.',
  'Matching is by content, not by identifier. Statuses: VERIFIED (asserted and passed),',
  'RETRIEVED (fetched, nothing asserted), MISMATCH (an assertion failed), FAILED (retrieval failed).', ''];
for (const r of records) {
  md.push(`## ${r.id}${r.label ? ' — ' + r.label : ''}`, '');
  md.push(`- Source: \`${r.source}\`${r.url ? ` — <${r.url}>` : ''}`);
  md.push(`- Fetched (UTC): ${r.fetchedUtc ?? '—'}${r.fetchedVia ? ` via ${r.fetchedVia}` : ''}`);
  md.push(`- Status: **${r.status}**${r.error ? ` — ${r.error}` : ''}`);
  for (const [k, v] of Object.entries(r.fields)) {
    md.push(`- Fingerprint \`${k}\`: \`${r.fingerprints[k]}\`${v ? ` (${v.length} chars)` : ' (empty)'}`);
  }
  for (const a of r.assertions) md.push(`- Assertion ${a.kind}: ${a.pass ? 'PASS' : '**FAIL**'} (${a.verdict}${a.run ? `, run ${a.run}` : ''})`);
  if (r.crossCheck) md.push(`- Cross-check: **${r.crossCheck.verdict}** (${r.crossCheck.via}${r.crossCheck.matchedIds ? `, matched ids: ${r.crossCheck.matchedIds.join(', ') || 'none'}` : ''})`);
  md.push('');
  for (const [k, v] of Object.entries(r.fields)) {
    if (!v) continue;
    const short = v.length > 1200 ? v.slice(0, 1200) + ' […]' : v;
    md.push(`**${k}:** ${short}`, '');
  }
}
writeFileSync(join(outDir, 'records.md'), md.join('\n') + '\n');

const counts = records.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
console.log(`\n${records.length} reference(s) -> ${jsonPath}`);
console.log('  ' + Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join('  '));
if (counts.MISMATCH || counts.FAILED) {
  console.log('  NOTE: MISMATCH/FAILED entries must be resolved or removed before publication; never ship an unresolved citation.');
}
