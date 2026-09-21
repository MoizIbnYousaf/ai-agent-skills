// match.mjs -- the comparison ladder.
//
// A verification is only as good as its matching rule, and the rule must be stated. This
// module answers one question: "is what I retrieved the same text as what I expected (or as
// what the second source holds)?" -- and returns the strength of the answer, never a bare
// boolean.
//
// THE LADDER, weakest evidence first. Always report which rung you landed on:
//
//   exact           byte-identical after context-free cleanup
//   normalized      identical under the profile (marks/case/letter variants folded)
//   contains        one normalised string wholly contains the other
//   content-match   a long unbroken run is shared -- same text, different surrounding matter
//   partial         a substantial but not dominant run is shared (e.g. same matn, different
//                   chain, or heavy editorial intervention)
//   weak            only scattered short runs
//   mismatch        nothing meaningful in common
//
// CRITICAL: never match by identifier alone. Two datasets routinely number the same item
// differently, so `item 155` in source A may be an unrelated item in source B. Match by
// content, then read the identifier off the matched record.

import { normalize } from './normalize.mjs';

const DEFAULT_OPTS = {
  profile: 'unicode',
  window: 40,      // seed length for a shared run
  step: 10,        // stride between seeds (smaller = more thorough, slower)
  strongRatio: 0.6, // run / shorter length for `content-match`
  partialRatio: 0.25,
  partialAbs: 40,   // absolute run length that qualifies as `partial` regardless of ratio
  minProbe: 12,     // refuse to score on trivially short text
};

/**
 * Longest run of characters shared by a and b, found by seeding with windows and
 * extending. Linear-ish and ample for citation-sized texts (a full quadratic LCS on
 * multi-thousand-character hadith is needlessly expensive).
 */
export function longestCommonRun(a, b, { window = 40, step = 10 } = {}) {
  if (!a || !b) return 0;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < window) return long.includes(short) ? short.length : 0;

  let best = 0;
  for (let i = 0; i + window <= short.length; i += step) {
    const seed = short.slice(i, i + window);
    if (!long.includes(seed)) continue;
    let len = window;
    while (i + len + step <= short.length && long.includes(short.slice(i, i + len + step))) len += step;
    if (len > best) best = len;
  }
  return best;
}

/** Token-set similarity (Jaccard). A second opinion when runs are broken by edits. */
export function jaccard(a, b) {
  const A = new Set(a.split(' ').filter(Boolean));
  const B = new Set(b.split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Compare two texts and return a graded verdict.
 * @returns {{verdict:string, run:number, ratio:number, jaccard:number, aLen:number, bLen:number, opts:object}}
 */
export function compare(a, b, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const A = normalize(a, o.profile);
  const B = normalize(b, o.profile);
  const shorter = Math.min(A.length, B.length);
  const out = { verdict: 'mismatch', run: 0, ratio: 0, jaccard: 0, aLen: A.length, bLen: B.length, opts: o };

  if (!A || !B) return out;
  if (String(a) === String(b)) { out.verdict = 'exact'; out.run = shorter; out.ratio = 1; out.jaccard = 1; return out; }
  if (A === B) { out.verdict = 'normalized'; out.run = shorter; out.ratio = 1; out.jaccard = 1; return out; }

  // Below the discrimination floor, run statistics are meaningless -- but containment is
  // still a valid test (e.g. asserting that a specific short phrase occurs in a long text).
  if (shorter < o.minProbe) {
    if (A.includes(B) || B.includes(A)) { out.verdict = 'contains'; out.run = shorter; out.ratio = 1; }
    else { out.verdict = 'mismatch'; out.run = 0; out.ratio = 0; }
    return out;
  }

  if (A.includes(B) || B.includes(A)) {
    out.verdict = 'contains';
    out.run = shorter;
    out.ratio = 1;
    out.jaccard = jaccard(A, B);
    return out;
  }

  const run = longestCommonRun(A, B, o);
  const ratio = shorter ? run / shorter : 0;
  out.run = run;
  out.ratio = Number(ratio.toFixed(3));
  out.jaccard = Number(jaccard(A, B).toFixed(3));

  if (ratio >= o.strongRatio) out.verdict = 'content-match';
  else if (ratio >= o.partialRatio || run >= o.partialAbs) out.verdict = 'partial';
  else if (run >= o.window) out.verdict = 'weak';
  else out.verdict = 'mismatch';

  return out;
}

export const PASSING_VERDICTS = new Set(['exact', 'normalized', 'contains', 'content-match']);

/** True when the verdict is strong enough to call the texts the same. */
export function isSame(verdict, { allowPartial = false } = {}) {
  return PASSING_VERDICTS.has(verdict) || (allowPartial && verdict === 'partial');
}

// ---- content-addressed lookup over a corpus ---------------------------------------------

/**
 * Find every entry in `entries` whose text contains `probe` under the profile.
 * Entries must already be normalised, or pass `profile` via the prepared `norm` field.
 * This is the identifier-independent lookup: it reports which corpus items actually
 * contain the text, whatever they happen to be numbered.
 */
export function findByContent(entries, probe, { profile = 'unicode', minProbe = 20, textField = 'norm' } = {}) {
  const p = normalize(probe, profile);
  if (p.length < minProbe) throw new Error(`probe too short to discriminate (need >= ${minProbe} normalised chars)`);
  const hits = [];
  for (const e of entries) {
    const t = e[textField] ?? '';
    if (t.includes(p)) hits.push(e);
  }
  return hits;
}
