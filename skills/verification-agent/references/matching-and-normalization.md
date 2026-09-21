# Matching and Normalisation

The comparison ladder, the profiles, and how to choose among them. Getting this wrong is the
most common cause of a verification that passes and is nonetheless wrong.

## The ladder

`compare(a, b, opts)` returns a **verdict**, never a bare boolean. Weakest evidence first:

| Verdict | Meaning |
|---|---|
| `exact` | Byte-identical after context-free cleanup |
| `normalized` | Identical once the profile has folded marks, case and letter variants |
| `contains` | One normalised string wholly contains the other |
| `content-match` | A long unbroken run is shared — same text, different surrounding matter |
| `partial` | A substantial but not dominant run is shared (same core text, different chain or heavy editing) |
| `weak` | Only scattered short runs |
| `mismatch` | Nothing meaningful in common |

Alongside the verdict you get `run` (longest shared run, in characters), `ratio`
(`run ÷ shorter length`) and `jaccard` (token-set overlap). Report these numbers: a verdict
can be argued with, a bare "it matched" cannot.

`content-match` is the workhorse for cross-source work: the same hadith transmitted through
two different chains shares its matn and differs in its isnād, so a long run is shared while
the whole strings differ substantially.

## Choosing the rung — the decision that matters

There are two distinct jobs, and they need **different strictness**. Using one setting for both
is how verification systems quietly fail.

### Job 1 — cross-source comparison (permissive)

Question: *do these two independent sources carry the same text?*
Accept: `exact`, `normalized`, `contains`, `content-match`.
Because: chains, editorial insertions, apparatus and orthographic house style legitimately
differ between editions of the same work.

### Job 2 — self-integrity (strict)

Question: *is the string I published the string I verified?*
Accept: `exact`, `normalized` **only**.
Because: both strings come from your own pipeline, so anything beyond whitespace and case
difference is a defect. Two real traps:

- Accepting `content-match` lets a **truncated or extended** string pass. A 40-character
  prefix of a 700-character passage scores `content-match` at ratio 0.93 — a deliberate
  corruption passed the check until the rung was tightened.
- A **script-folding profile discards evidence**. The `arabic` profile strips everything
  outside `U+0600–06FF`, so Latin characters injected into a quoted Arabic passage vanish
  before comparison and the tampered string compares equal.

`qa-records.mjs` therefore defaults to the strict rung under the `unicode` profile, and offers
`--allow-partial` for the honest case where you knowingly publish an abridgement.

### Job 3 — assertion (precise)

Question: *does the source contain this specific phrase?*
Accept: `exact`, `normalized`, `contains`.
Not `content-match`: "contains" means X occurs in the text, not that the text substantially
overlaps something containing X.

## Profiles

Two mechanisms, applied in order. Understanding which does what prevents most mistakes.

**1. Generic mark folding — any script.** NFD → drop Unicode `Mn` (combining marks) → NFC.
Handles Latin macrons, Arabic harakat, Hebrew niqqud, Greek accents, Vietnamese tone marks —
everything that is a combining mark. Use `diacritic-fold` as the script-agnostic default.

**2. Script folding — per writing system.** Letter variants that are *not* combining marks and
therefore survive step 1. This is script knowledge, and no generic rule substitutes for it.

| Profile | Folds | Use for |
|---|---|---|
| `identity` | nothing | When you truly need byte equality |
| `unicode` | NFKC, whitespace, case | Default; self-integrity checks |
| `diacritic-fold` | + all combining marks, any script | Cross-source when the script has no letter variants |
| `latin` | + diacritics, dash/quote style, ellipsis | Prose quotations, bibliographic strings |
| `latin-alnum` | + strips punctuation | Fuzzy quote matching |
| `arabic` | + alef forms → alef, alef maqṣūra → yāʾ, tāʾ marbūṭa → hāʾ, drops tatweel, keeps only `U+0600–06FF` | Arabic scripture and prose |
| `hebrew` | + niqqud and teʿamim, keeps letters | Hebrew |
| `greek` | + accents, final sigma → sigma | Greek |
| `numeric` | digits only, unifies separators and minus signs | Checking a figure appears |

The `arabic` profile's "keeps only `U+0600–06FF`" clause is doing real work: it discards
stray Latin, editorial brackets and footnote digits. It is right for cross-source comparison
and wrong for self-integrity, for exactly that reason.

## Probing content, not apparatus

Content-addressed lookup is only as good as the probe.

A probe drawn from **shared apparatus** matches many records and identifies nothing. In a
collection of ḥadīth, the isnād (chain of transmission) is shared by every report on that
chain: an 80-character probe from the middle of one report matched six unrelated reports — all
of them simply transmitted by the same narrators.

A probe drawn from **distinctive content** matches precisely. The same report probed with 90
characters of its matn (the actual narrative) matched exactly one record.

Rules of thumb:

- More than a handful of hits means the probe is apparatus, not content. Re-probe.
- Prefer the middle of the passage over the opening: openings are formulaic.
- 40–120 normalised characters is usually enough. Longer probes are brittle across editions;
  shorter ones stop discriminating.
- If a probe finds nothing, try a shorter span closer to the centre before concluding absence.

## Fingerprints

`fingerprint(text)` returns the first 16 hex of SHA-256 over the text **as retrieved**. It
pins the exact string used, so a later reader can detect any drift in the source or in your
pipeline. Two cautions:

- Hash the retrieved text, not the normalised text. Normalisation is for comparison; the hash
  is for identity.
- A hash proves the string has not changed. It proves nothing about whether the string is
  correct — that is what cross-checking is for.
