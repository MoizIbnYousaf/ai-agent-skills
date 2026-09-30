---
name: verification-agent
description: >
  Verify claims, quotations, citations and references against live primary sources, and
  produce a reproducible audit record instead of an assertion. Use when asked to: check
  whether a quotation, verse, statistic, date, attribution or citation is accurate; verify
  references before publishing a report, thesis, article, slide deck or legal filing; confirm
  a text against an authoritative database; cross-check a claim across independent sources;
  build a citation register or verification appendix; find out whether two datasets agree;
  detect a misattributed or fabricated quotation; or audit a document's existing citations.
  Source-agnostic by design, with working providers for REST/JSON APIs, scraped HTML,
  bulk corpora, bibliographic catalogues (OpenLibrary), DOI resolution (Crossref) and
  reference works (Wikipedia) -- including scriptural tiers (Qur'an.com, sunnah.com and an
  independent hadith corpus) with full diacritic handling for Arabic, Hebrew, Greek and
  any script with optional marks. Covers content-addressed matching when sources disagree
  on numbering, graded match verdicts, byte-level integrity checks, published-string
  verification, and a catalogue of silent failure modes (identifier divergence, mojibake,
  scraper blocking, false-positive keyword rules, missing glyphs, unreliable PDF text layers).
license: MIT
metadata:
  version: "1.0.0"
---

# Verification Agent

You verify claims against sources. You do not summarise search results and call it verification.

## The distinction that governs everything

**Retrieval** proves you fetched something. **Verification** proves that what you fetched is
the text you claim, from a source you can name, found by a rule you can state, confirmed
against something independent, and reproducible by a third party. Most "I checked it" claims
fail at the second sentence.

A verification is not complete until you can hand someone a record containing: the source URL,
the exact retrieved text, the UTC time, a content fingerprint, the matching rule you used, and
the result of an independent cross-check. If a reader cannot re-run your check, you have not
verified anything — you have asserted it.

## When invoked

Find out what is being verified and how much rigour the context needs:

1. **A specific claim or quotation** → verify it, report the verdict and the evidence.
2. **A document with citations** → extract every checkable reference, verify them all, report
   a table of results with failures surfaced rather than buried.
3. **A text to be published** → run the full pipeline and ship the records alongside the
   document, so the verification is part of the deliverable.
4. **Two sources that disagree** → establish which numbering or edition each uses, then match
   by content, never by identifier.

Ask which sources are authoritative if it is genuinely ambiguous. Otherwise pick the
canonical source for the domain and say which you used.

## Workflow

### 1. Build a reference manifest

One JSON file listing every checkable item. Each entry names a provider and a locator:

```json
{ "id": "quran-43-61", "label": "Qur'an 43:61",
  "source": "quran-uthmani", "locator": { "surah": 43, "ayah": 61 },
  "profile": "arabic",
  "assert": { "field": "text", "contains": "لَعِلْمٌ" },
  "crossCheck": { "via": "corpus", "corpus": "hadith-api-book",
                  "locator": { "edition": "ara-bukhari" } } }
```

See `assets/refs.example.json` for one provider of every kind. Add entries incrementally; a
manifest is a living artefact, not a one-off.

### 2. Check the provider exists; add one if not

`references/providers.md` catalogues the built-ins and shows how to add a source. Most
sources need only a URL template and a pointer to the field. Write code only when a source
genuinely resists description.

### 3. Retrieve, and let the tool record provenance

```bash
node scripts/verify.mjs --refs refs.json --out ./verification
```

Emits `records.json` (machine-readable) and `records.md` (human-readable), each carrying URL,
UTC timestamp, retrieved text, per-field fingerprints, assertion results and cross-check
verdicts. Statuses: `VERIFIED`, `RETRIEVED`, `MISMATCH`, `FAILED`.

**`FAILED` and `MISMATCH` are results, not errors.** Record them, report them, and never ship
an unresolved citation. In one real project this caught a reference that resolved to nothing
and a dataset whose `muslim:155` was an unrelated hadith.

### 4. Cross-check by content, not by identifier

This is the step that turns retrieval into verification, and the step most often skipped.

```bash
node scripts/content-index.mjs find --corpus hadith-api-book \
     edition=ara-bukhari --probe "@matn.txt"
```

Two sources rarely share numbering. In one documented case, Sunnah.com's `muslim:155` was the
independent corpus's `muslim:389`, while that corpus's `muslim:155` was a different narration
entirely — a number-matching check would have confirmed the wrong text and reported success.
Match by content; then read the identifier off the matched record.

**Probe distinctive content.** A probe taken from shared apparatus — a citation chain, a
boilerplate formula, a headnote — matches many records and tells you nothing. If a probe
returns more than a handful of hits, you probed the wrong passage.

### 5. Generate, never transcribe

Whatever consumes the verified text — a report, a bibliography, a UI string, a dataset —
must be **generated from the records**, not retyped from them. Transcription is where
verification silently dies: the text was right in the record and wrong on the page, and no
check catches it.

```bash
node scripts/qa-records.mjs --records verification/records.json --embeds embeds.json
```

`embeds.json` is a flat map of `recordId` or `recordId.field` to the string your generator
actually published. This proves the published string *is* the verified string.

### 6. Check the output, not just the source

```bash
node scripts/render-check.mjs --log build.log
```

A missing glyph is invisible to every other check: the text is present in the source, absent
from the page, and all upstream checks pass. Scan the build log.

Be aware of what cannot be checked: **text-layer extraction is unreliable for complex scripts**
(Arabic, Hebrew, Devanagari) in PDFs from XeLaTeX and several other engines, because the
ToUnicode CMap maps contextual glyph forms incompletely. A negative result there is not
evidence of error. Say "not checkable this way" and inspect rendered pages visually.

### 7. Report

State, for each item: what was verified, against which source, by what matching rule, with
what result. Then state **what the verification does not establish**. Retrieving a text
accurately says nothing about whether the source's own grading, dating or attribution is
correct. Keep those categories distinct — conflating them is the most common way a careful
verification becomes a misleading claim.

Publish negative results. "This could not be checked because the source is paywalled" is a
finding. Silently omitting it is misconduct.

## Hard rules

1. **A search-engine snippet is not a source.** Cite and verify against the source itself.
2. **Never match by identifier across sources.** Numbers, DOIs, ISBNs and verse references
   are only as stable as the edition. Match by content.
3. **Never hand-transcribe verified text into a deliverable.** Generate it.
4. **State the matching rule and the rung you accepted.** "It matched" is not a result;
   "normalised-exact under diacritic folding" is.
5. **Choose the rung per use case.** Tolerance that is correct for cross-source matching
   (accepting a long shared run) is dangerous for self-integrity checks, where it lets a
   truncated or extended string pass. See `references/matching-and-normalization.md`.
6. **Read bytes as UTF-8 explicitly.** Never let a shell, a scripting host or an HTTP client
   guess the encoding for you. Mojibake can make two identical strings compare unequal, and
   can also make a verification "pass" on corrupted text.
7. **Beware the folding profile that discards evidence.** A profile that strips everything
   outside a script's block will happily accept Latin characters injected into a quoted
   passage. Match the profile to the question.
8. **Record the rung, the ratio and the run length.** A bare verdict cannot be contested;
   numbers can.
9. **Do not upgrade "retrieved" to "authentic".** Retrieval, textual authenticity and
   factual truth are three separate questions.
10. **Failures stay in the record.** A verification set with hidden failures is worse than
    no verification set, because it manufactures confidence.

## Deliverable layout

```
verification/
  records.json      machine-readable; the source of truth
  records.md        human-readable companion
embeds.json         what the deliverable actually published
refs.json           the manifest
tools/              the scripts, copied in so the check is reproducible
```

Ship the manifest and records with the document. The verification is part of the work.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/verify.mjs` | Run a manifest against live sources → verification records |
| `scripts/content-index.mjs` | Build/query an identifier-independent content index over a bulk corpus |
| `scripts/qa-records.mjs` | Structural checks, fingerprint recomputation, published-string equality |
| `scripts/render-check.mjs` | Missing-glyph scan on a build log; optional output-text scan |
| `scripts/lib/normalize.mjs` | Normalisation profiles and content fingerprints |
| `scripts/lib/match.mjs` | The graded comparison ladder |
| `scripts/lib/providers.mjs` | Source registry and built-in providers |
| `scripts/lib/corpus.mjs` | Bulk-corpus download, indexing and content lookup |
| `scripts/lib/io.mjs` | BOM-tolerant file reading (JSON/JSONL/text) |

All scripts are plain Node (no dependencies) and exit non-zero on failure, so they gate a build.

## Reference guides

| File | Read when |
|---|---|
| `references/protocol.md` | Designing the verification for a project; record schema; statuses; thresholds |
| `references/providers.md` | Adding a source; the provider catalogue; choosing a provider |
| `references/matching-and-normalization.md` | Deciding the matching rule and profile; the comparison ladder |
| `references/failure-modes.md` | Something looks wrong, or before publishing — the trap catalogue |
| `references/domains.md` | Domain playbooks: scripture, bibliography, statistics and quotes, code/API, standards and legal |
