#!/usr/bin/env node
// qa-records.mjs -- integrity checks on a verification record set, and on the strings a
// document actually publishes.
//
//   node qa-records.mjs --records verification/records.json
//   node qa-records.mjs --records verification/records.json --embeds embeds.json [--profile latin]
//   node qa-records.mjs --records verification/records.json --allow-failed
//
// The `--embeds` check is the important one. Whatever your generator emits -- LaTeX macros,
// MDX, HTML, an i18n bundle -- dump it to a flat JSON map of `recordId` or `recordId.field`
// to string, and this proves the published string IS the verified string. That is what makes
// "no text was transcribed by hand" a checkable claim rather than a promise.
//
// Exit code is non-zero when a check fails, so it can gate a build.

import { readFileSync } from 'node:fs';
import { compare, isSame } from './lib/match.mjs';
import { fingerprint, normalize } from './lib/normalize.mjs';
import { readJson } from './lib/io.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const has = (n) => args.includes('--' + n);

const recordsPath = flag('records');
if (!recordsPath) { console.error('usage: qa-records.mjs --records records.json [--embeds embeds.json]'); process.exit(2); }

const data = readJson(recordsPath, 'record set');
const records = data.records ?? data;
const embedsPath = flag('embeds');
const profile = flag('profile');
const allowFailed = has('allow-failed');
const allowPartial = has('allow-partial');

let problems = 0;
const fail = (m) => { problems++; console.log('  FAIL  ' + m); };
const ok = (m) => console.log('  ok    ' + m);

console.log(`records: ${records.length} (from ${recordsPath})`);

// ---- 1. structural completeness ---------------------------------------------------------
const REQUIRED = ['id', 'source', 'status'];
const seen = new Set();
for (const r of records) {
  for (const f of REQUIRED) if (!r[f]) fail(`${r.id ?? '(no id)'}: missing required field "${f}"`);
  if (seen.has(r.id)) fail(`duplicate record id "${r.id}"`);
  seen.add(r.id);
  if (r.status === 'FAILED' && !allowFailed) fail(`${r.id}: status FAILED (${r.error ?? 'no reason'}) -- resolve or remove before publishing`);
  if (r.status === 'MISMATCH') fail(`${r.id}: status MISMATCH -- an assertion or cross-check did not hold`);
  if (!r.fetchedUtc) fail(`${r.id}: no retrieval timestamp`);
}
if (!problems) ok('structure complete, ids unique, no unresolved statuses');

// ---- 2. fingerprints recompute ----------------------------------------------------------
let fpChecked = 0;
for (const r of records) {
  for (const [field, fp] of Object.entries(r.fingerprints ?? {})) {
    fpChecked++;
    const actual = fingerprint(r.fields?.[field] ?? '');
    if (actual !== fp) fail(`${r.id}.${field}: fingerprint mismatch (record says ${fp}, text hashes to ${actual})`);
  }
}
ok(`${fpChecked} fingerprint(s) recomputed over the stored text`);

// ---- 3. published strings equal verified strings ----------------------------------------
if (embedsPath) {
  const embeds = readJson(embedsPath, 'embeds file');
  const byId = new Map(records.map((r) => [r.id, r]));
  let checked = 0;
  for (const [key, value] of Object.entries(embeds)) {
    const [id, field = 'text'] = key.split('.');
    const rec = byId.get(id);
    if (!rec) { fail(`embed "${key}" refers to no record`); continue; }
    const expected = rec.fields?.[field];
    if (expected === undefined) { fail(`embed "${key}": record has no field "${field}"`); continue; }
    checked++;
    // IMPORTANT -- choose the rung deliberately.
    //
    // This check compares your own generator's output against your own record, so it must be
    // near-EXACT. Two traps otherwise:
    //   * a script-folding profile (e.g. 'arabic') discards everything outside the script's
    //     block, so Latin characters injected into a quoted passage vanish and the check
    //     passes; and
    //   * accepting `content-match` lets a truncated or extended string through, because a
    //     long shared prefix is exactly what `content-match` is designed to tolerate.
    // Tolerance of that kind belongs in cross-source comparison, not in self-integrity.
    // Pass --allow-partial only when you knowingly publish an abridgement.
    const STRICT = new Set(['exact', 'normalized']);
    const c = compare(String(value), expected, { profile: profile ?? 'unicode' });
    if (STRICT.has(c.verdict) || (allowPartial && isSame(c.verdict))) continue;
    fail(`embed "${key}" differs from the record (${c.verdict}, shared run ${c.run} chars, ratio ${c.ratio})`);
  }
  ok(`${checked} published string(s) compared against their records`);
} else {
  console.log('  --    no --embeds file given; published-string check skipped');
}

// ---- 4. summary ------------------------------------------------------------------------
console.log('');
if (problems) {
  console.log(`${problems} problem(s). Do not publish until resolved.`);
  process.exit(1);
}
console.log('All integrity checks passed.');
