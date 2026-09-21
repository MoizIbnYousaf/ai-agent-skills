# verification-agent

A skill for verifying claims, quotations, citations and references against live primary
sources — and for producing a reproducible audit record instead of an assertion.

## The idea

**Retrieval** proves you fetched something. **Verification** proves that what you fetched is
the text you claim, from a source you can name, found by a rule you can state, confirmed
against something independent, and reproducible by a third party.

Most "I checked it" claims fail at the second sentence.

## What it does

- Retrieves from REST/JSON APIs, scraped HTML, bulk corpora, bibliographic catalogues (OpenLibrary),
  DOI resolvers (Crossref) and reference works — source-agnostic, with working providers for
  each, including fully vocalised scriptural text (Qur'an, ḥadīth) with Arabic, Hebrew and
  Greek normalisation.
- Cross-checks by **content, not identifier**, because sources routinely disagree on numbering —
  in one documented case the same citation was `155` in one dataset and `389` in another, while
  `155` in the second dataset was an unrelated text.
- Grades every comparison on a ladder (`exact` → `normalized` → `contains` → `content-match` →
  `partial` → `weak` → `mismatch`) and reports the run length and ratio, so a result can be
  contested rather than merely believed.
- Generates deliverable text **from the records**, then proves the published string equals the
  verified string.
- Scans build output for silent failures — missing glyphs, unreliable PDF text layers for
  complex scripts, bidirectional rendering errors.

## Quick start

```bash
# 1. Describe what you need to check
cp assets/refs.example.json refs.json     # edit: one entry per claim

# 2. Retrieve and record
node scripts/verify.mjs --refs refs.json --out ./verification

# 3. Cross-check by content against an independent source
node scripts/content-index.mjs find --corpus hadith-api-book \
     edition=ara-bukhari --probe "@matn.txt"

# 4. Prove your document publishes the verified strings
node scripts/qa-records.mjs --records verification/records.json --embeds embeds.json

# 5. Check the rendered output for silent character loss
node scripts/render-check.mjs --log build.log
```

All scripts are plain Node with no dependencies, and exit non-zero on failure, so they gate a
build.

## Layout

```
SKILL.md                              the workflow, and the rules that matter
references/protocol.md                record schema, statuses, thresholds, scaling
references/providers.md               provider catalogue and how to add a source
references/matching-and-normalization.md   the comparison ladder and normalisation profiles
references/failure-modes.md           13 silent failure modes, with symptoms and fixes
references/domains.md                 playbooks: scripture, bibliography, statistics and
                                      quotes, code/API, standards and legal, science
scripts/verify.mjs                    manifest -> verification records
scripts/content-index.mjs             identifier-independent content index
scripts/qa-records.mjs                integrity checks and published-string equality
scripts/render-check.mjs              missing-glyph and output-text checks
scripts/lib/                          normalize, match, providers, corpus
assets/                               example manifest, embeds and JSON schema
```

## The three questions, kept separate

1. **Retrieval** — is this the text the source holds? *These scripts answer this.*
2. **Authenticity** — is the source's own attribution or grading correct? *The source asserts
   this; you are relaying it.*
3. **Truth** — is the claim factually correct? *Neither settles this.*

Conflating them is the most common way a careful verification becomes a misleading claim.

## License

MIT
