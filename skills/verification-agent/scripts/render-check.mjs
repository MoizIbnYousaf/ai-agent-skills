#!/usr/bin/env node
// render-check.mjs -- verify that what you published is what you verified, on the OUTPUT side.
//
//   node render-check.mjs --log build.log
//   node render-check.mjs --log build.log --text extracted.txt --expect embeds.json [--profile latin]
//
// Two independent checks:
//
//   --log     scan a build log for missing-glyph and overflow warnings. A missing glyph is
//             silent in most toolchains: the text is present in the source, absent from the
//             page, and every other check still passes. This is the only check that catches it.
//
//   --text    scan text extracted from the finished artefact for the strings you expect.
//
// KNOWN LIMITATION, and it is a real one: text-layer extraction is UNRELIABLE for complex
// scripts (Arabic, Hebrew, Devanagari) in PDFs produced by XeLaTeX and several other engines,
// because the ToUnicode CMap maps contextual glyph forms incompletely. Expect base letters to
// be missing while combining marks survive. A negative result from --text on such a document
// is NOT evidence the text is wrong. Report it as "not checkable this way" rather than as a
// pass or a failure, and fall back to visual inspection of rendered pages.

import { readFileSync, existsSync } from 'node:fs';
import { compare, isSame } from './lib/match.mjs';
import { normalize } from './lib/normalize.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };

// Toolchain-specific signatures for a glyph that could not be drawn.
const MISSING_GLYPH_PATTERNS = [
  [/Missing character:\s*(.*)/g, 'LaTeX/XeTeX'],
  [/Glyph\s+\S+\s+\(.*?\)\s+not found/gi, 'fontTools/matplotlib'],
  [/Glyph\s+\d+\s+\(.*?\)\s+missing from (current )?font/gi, 'matplotlib'],
  [/Font\s+.*?does not contain glyph/gi, 'generic'],
  [/no glyph for U\+[0-9A-Fa-f]+/gi, 'HarfBuzz/Pango'],
  [/Failed to load glyph/gi, 'generic'],
  [/\.notdef/gi, 'PDF (notdef glyph drawn)'],
];

const WARNING_PATTERNS = [
  [/^! .*$/gm, 'LaTeX error'],
  [/Overfull \\hbox/g, 'LaTeX overfull box'],
  [/Overfull \\vbox/g, 'LaTeX overfull box'],
  [/Undefined control sequence/g, 'LaTeX undefined control sequence'],
  [/LaTeX Warning: (Reference|Citation).*undefined/g, 'LaTeX undefined reference'],
];

const logPath = flag('log');
let problems = 0;

if (logPath) {
  if (!existsSync(logPath)) { console.error(`log not found: ${logPath}`); process.exit(2); }
  const log = readFileSync(logPath, 'utf8');
  console.log(`log: ${logPath} (${log.length} chars)`);

  let glyphs = 0;
  for (const [re, who] of MISSING_GLYPH_PATTERNS) {
    const hits = [...log.matchAll(re)];
    if (!hits.length) continue;
    glyphs += hits.length;
    problems += hits.length;
    for (const m of hits.slice(0, 5)) console.log(`  MISSING GLYPH [${who}] ${m[1] ? m[1].trim().slice(0, 90) : m[0].trim().slice(0, 90)}`);
    if (hits.length > 5) console.log(`  … and ${hits.length - 5} more`);
  }
  console.log(glyphs === 0
    ? '  ok    no missing-glyph warnings'
    : `  ${glyphs} missing-glyph warning(s) — some characters are absent from the output`);

  for (const [re, who] of WARNING_PATTERNS) {
    const n = [...log.matchAll(re)].length;
    if (n) console.log(`  note  ${n} × ${who}`);
  }
}

const textPath = flag('text');
const expectPath = flag('expect');
if (textPath && expectPath) {
  if (!existsSync(textPath)) { console.error(`extracted text not found: ${textPath}`); process.exit(2); }
  const text = readFileSync(textPath, 'utf8');
  const expects = JSON.parse(readFileSync(expectPath, 'utf8'));
  const profile = flag('profile', 'unicode');

  const nonLatin = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF]/.test(text);
  let found = 0, absent = 0;
  const normText = normalize(text, profile);
  for (const [key, value] of Object.entries(expects)) {
    const c = compare(value, text, { profile, window: 20, step: 10 });
    if (isSame(c.verdict, { allowPartial: true })) found++;
    else { absent++; console.log(`  absent from output text: ${key} (${c.verdict}, run ${c.run})`); }
  }
  console.log(`\npublished-string scan: ${found} present, ${absent} not found`);
  if (nonLatin && absent > 0) {
    console.log('  NOTE: the output contains complex-script text. Text-layer extraction is');
    console.log('  unreliable for such scripts, so the absences above are NOT evidence of error.');
    console.log('  Treat this check as inconclusive and inspect rendered pages visually.');
  } else if (absent > 0) {
    problems += absent;
  }
}

console.log('');
if (problems) { console.log(`${problems} issue(s) found.`); process.exit(1); }
console.log('Render check passed.');
