# Verification Protocol

The full protocol, the record schema, and the decisions you must make explicitly.

## The eight steps

1. **Scope.** List every checkable item. Decide what counts as checkable: a named source's
   text, a number, a date, an attribution, a translation, a legal citation. Exclude what
   cannot be checked and say so.
2. **Source selection.** For each item, name the canonical source. Prefer: the primary
   publisher or database → an institutional mirror → a bulk dataset of the same edition.
   A secondary aggregator is acceptable only if you say it is one.
3. **Manifest.** Encode each item as `{id, source, locator}` with optional `assert`,
   `profile`, `crossCheck`. One file, version-controlled.
4. **Retrieve.** Fetch and extract. Record URL, UTC timestamp, HTTP status, transport used,
   and the extracted field names. Extraction failures are `FAILED`, never empty strings.
5. **Assert** (optional). Where you hold an expectation — a phrase you believe is present, a
   number you believe is correct — encode it. An assertion that fails is the single most
   valuable output the system produces.
6. **Cross-check.** Confirm against an independent source. Two kinds:
   - `via: provider` — fetch from another provider and compare by content.
   - `via: corpus` — content-addressed lookup in a bulk dataset. Required when numbering
     differs, which is the normal case for large collections.
7. **Generate and verify publication.** Emit deliverable text *from the records*, then prove
   equality with `qa-records.mjs --embeds`.
8. **Report.** Publish records, verdicts, and the limits of what was established.

## Record schema

```jsonc
{
  "id": "bukhari-3448",
  "label": "al-Bukhari 3448 -- the descent report",
  "source": "sunnah",
  "locator": { "path": "bukhari:3448" },
  "profile": "arabic",
  "fetchedUtc": "2026-02-11T09:14:22Z",     // when
  "url": "https://sunnah.com/bukhari:3448", // where
  "fetchedVia": "curl (fetch returned 403)", // how, incl. fallbacks
  "httpStatus": 200,
  "fields": {                                // what -- as retrieved
    "text": "...",
    "english": "...",
    "grade": ""
  },
  "fingerprints": { "text": "6a1c…", "english": "ff03…" }, // SHA-256 prefix per field
  "assertions": [
    { "kind": "contains", "field": "text", "pass": true, "verdict": "contains" }
  ],
  "crossCheck": {
    "via": "corpus", "corpus": "hadith-api-book",
    "index": "…/ara_bukhari.min.json.jsonl",
    "hits": 1, "matchedIds": [3448],
    "verdict": "INDEPENDENT-CONFIRM"
  },
  "status": "RETRIEVED",
  "error": null
}
```

See `assets/records.schema.json` for the machine-checkable version.

## Statuses

| Status | Meaning | Action |
|---|---|---|
| `VERIFIED` | Retrieved and every assertion passed | Publish |
| `RETRIEVED` | Retrieved; nothing asserted | Publish as a citation; add assertions where you hold expectations |
| `MISMATCH` | An assertion or cross-check failed | **Investigate before publishing.** Either your expectation was wrong or the source does not say what was claimed |
| `FAILED` | Could not retrieve | Report it. Never convert to an empty string and move on |

`MISMATCH` is the point of the exercise. If nothing ever mismatches, your assertions are too
weak to be informative.

## The three questions, kept separate

Conflating these is the most common way a careful verification becomes a misleading claim.

1. **Retrieval** — is this the text the source holds? *Your scripts answer this.*
2. **Authenticity** — is the source's own attribution, grading, or dating correct? *The source
   asserts this; you are relaying it.*
3. **Truth** — is the claim factually correct? *Neither of the above settles this.*

A record proves (1). When you report, say that you rely on the source for (2) and are not
addressing (3). A publisher's "verified" badge that silently upgrades (1) to (3) is a lie, even
when every script passed.

## Decisions to make explicit

Write these down in the manifest's `meta` block, because a reader cannot recover them from the
records:

- **Which source is authoritative**, and why, when several exist.
- **Which matching rung you accept** as proof, and the thresholds behind it.
- **Which normalisation profile** each item uses, and therefore what variations are treated as
  equivalent. Folding that is right for one question is wrong for another.
- **What you deliberately did not check**, and why (paywalled, offline, requires expertise you
  are not claiming).
- **The date of verification.** Online sources change; a verification is a snapshot.

## Thresholds

Defaults live in `scripts/lib/match.mjs`; state any deviation.

| Setting | Default | Meaning |
|---|---|---|
| `minProbe` | 12 chars | Below this, run statistics are meaningless; only containment is tested |
| `window` / `step` | 40 / 10 | Seed length and stride when finding a shared run |
| `strongRatio` | 0.6 | Shared run ÷ shorter length for `content-match` |
| `partialRatio` | 0.25 | Floor for `partial` |
| `partialAbs` | 40 chars | Absolute run length that qualifies as `partial` regardless of ratio |

Char-based thresholds are script-sensitive. For CJK, 40 characters is a paragraph; for a
syllabic script it is a word. Raise `window` and `partialAbs` for dense scripts, and prefer
ratio-based acceptance.

## Scaling

- **Under ~30 items** — one pass, all assertions, full cross-check. Minutes.
- **30–300 items** — batch by source so connections and caches are reused; cross-check
  everything; expect to spend most of the time on `MISMATCH` triage.
- **Over 300 items** — parallelise across independent sources (each worker owns one source),
  keep assertions for the items that carry argumentative weight, and sample-verify the rest.
  State that you sampled, and how.

Never let volume dilute the record. A partially verified set that says which parts are
verified is useful; a fully "verified" set with hidden gaps is not.
