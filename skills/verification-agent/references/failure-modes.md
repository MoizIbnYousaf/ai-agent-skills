# Failure Modes

Every entry here cost real time to diagnose. Each has a **symptom**, a **cause**, and a **fix**.
Read this before publishing, and again when something looks wrong.

The unifying theme: **verification failures are silent**. A broken check that returns "pass"
looks exactly like a working check that returns "pass". That is why the checks in this skill
report ratios, runs and rungs rather than booleans, and why negative results are recorded.

---

## 1. Identifier divergence between sources

**Symptom.** A cross-check passes, and you later discover the two sources were discussing
different things.

**Cause.** Matching by number. Two datasets carrying "the same" collection frequently number
it differently — by edition, by recension, by whether sub-narrations get their own number.

**Real case.** A hadith verification compared Sunnah.com's `muslim:155` with a bulk corpus's
`muslim:155` and found them to be *different narrations*. The first source's `muslim:155` was
the second source's **`muslim:389`**. A number-matching check would have confirmed the wrong
text and reported success.

**Fix.** Match by content, always, across sources. Build a content index
(`content-index.mjs`) and read the identifier off the matched record. Treat any
identifier-based cross-check as unverified.

---

## 2. A keyword rule that is too broad

**Symptom.** Counts come out higher than they should; sampled items turn out not to be what
you counted.

**Cause.** A lexical predicate that catches coincidental co-occurrence. Filtering for "mentions
X together with a form of root Y" catches passages where Y belongs to something else entirely.

**Real case.** A rule for "reports about the descent of Jesus" matched a report about a
scholar teaching Qurʾān in a house at Minā — the root *n-z-l* appeared in "sent down" and the
name appeared in an unrelated clause.

**Fix.** Use distinctive markers, not co-occurrence. Then **hand-check a sample**: verify the
first several hits and the first several near-misses. State the rule and its known false-positive
rate. If two rules are plausible, report both and state the sensitivity — if the conclusion
survives either, say so; if it does not, the conclusion was never about the text.

---

## 3. Mojibake

**Symptom.** Retrieved text is full of `Ã`, `Ø`, `Ù`, `â€"`. Comparisons fail against correct
text. Or worse: two corrupted strings compare equal and the check passes.

**Cause.** UTF-8 bytes decoded as a single-byte codepage. Windows PowerShell 5.1, many shell
defaults, and some HTTP clients all do this by default.

**Real case.** A retrieval script read UTF-8 HTML with the host's default encoding, storing
mojibake into the record. A later comparison against a correct dataset showed a mismatch that
looked like a data problem and was an encoding problem.

**Fix.** Read bytes explicitly as UTF-8 at every boundary: `readFileSync(p, 'utf8')`,
`[System.IO.File]::ReadAllText(p, [Text.Encoding]::UTF8)`, `encoding='utf-8'`. Never rely on a
default. When comparing two retrievals, assert both decode cleanly first.

**Triage note — the corruption may be in your input, not the source.** When a check reports
`MISMATCH`, do not assume the source disagrees. In one case a manifest's Arabic probe reached
the tool as `Ù„ÙŽØ¹ÙÙ„Ù’Ù…ÙŒ` because a test harness copied the file with a default-encoding read.
The verification then behaved *perfectly*: it searched the source for a string that was not
there and correctly reported that it was absent. Time was spent suspecting the source before
anyone inspected the fixture. **Before investigating a mismatch, confirm that what you asked
for is what you meant to ask for** — print the probe as the tool received it.

Note that a BOM is a separate problem from mojibake and needs its own handling: a UTF-8 BOM is
invisible in every editor and fatal to `JSON.parse`. `scripts/lib/io.mjs` strips it at the
boundary so valid files written by Windows tooling load without complaint.

---

## 4. Script file parsed as ANSI

**Symptom.** A script that ran fine yesterday now dies with a syntax error on a line containing
an em dash, a quotation mark, or any non-ASCII character.

**Cause.** Windows PowerShell 5.1 reads a BOM-less UTF-8 script file as ANSI, mangling
non-ASCII literals into invalid syntax.

**Fix.** Keep automation scripts **ASCII-only**. If you must include non-ASCII, write the file
with a UTF-8 BOM, or better, move the data into a JSON file and read it explicitly as UTF-8.
Data belongs in data files; scripts should be pure ASCII.

---

## 5. A scraper that is blocked

**Symptom.** `403 Forbidden`, `406 Not Acceptable`, or an empty body — from one HTTP client
and not another.

**Cause.** Hosts discriminate against library clients and missing headers.

**Real case.** `Invoke-WebRequest` received `403` from a host that `curl.exe` fetched
normally with the same URL.

**Fix.** Send browser headers (`User-Agent`, `Accept`, `Accept-Language`). Implement a fallback
transport — the built-in fetcher retries with `curl` on 403/406/429 and records which transport
succeeded in `fetchedVia`. Record the transport in the verification record; a reader reproducing
your check needs to know.

---

## 6. Over-greedy or under-bounded extraction

**Symptom.** A field contains material from the *next* block — the English rendering includes
the Arabic, the abstract includes the first page of the body.

**Cause.** A non-greedy regular expression terminating at the first closing tag. It works until
the content contains a nested tag of the same type.

**Real case.** `(?s)<div class="english_hadith_full">(.*?)</div>` stopped at the first inner
`</div>`, returning 54 characters instead of the full rendering.

**Fix.** Bound the match on **both** sides with a positive lookahead at the next known block
marker, not a closing tag. Then assert the extracted length is plausible — a field that is
suspiciously short is a bug, not a short text.

---

## 7. Scalar-versus-array

**Symptom.** A field contains a single character where a word was expected (`"S"` instead of
`"Sahih"`).

**Cause.** A language that treats a single-element collection as a scalar. Indexing it yields
the first element of the *string*.

**Real case.** Selecting the longest of several matched grade cells returned `"S"` — with one
candidate, the collection degenerated to a string and `[0]` took its first character.

**Fix.** Force collection semantics before indexing (wrap in an array constructor, or use a
first-element helper). Assert on field shape, not only content.

---

## 8. Silent character loss in output

**Symptom.** The check passes, the source is right, and the rendered page shows blank boxes,
question marks, or nothing at all where a character should be.

**Cause.** The font lacks the glyph. No error is raised by default in most toolchains.

**Real case.** A serif font under consideration lacked a diacritic; three of five candidate
fonts silently dropped marks that a fourth rendered correctly. Separately, one text had a
ligature codepoint no Latin font carries.

**Fix.** Scan the build log for missing-glyph warnings (`render-check.mjs` covers LaTeX,
matplotlib, HarfBuzz/Pango, and generic writers). **Test candidate fonts against your actual
character inventory before committing to one** — compile a one-page specimen containing every
mark you use and inspect the rendering. Prefer fonts with proven coverage over fonts that
merely look right.

---

## 9. Unreliable text layers for complex scripts

**Symptom.** Extracting text from a finished PDF returns almost nothing, or only diacritics
with the base letters missing.

**Cause.** The PDF's ToUnicode CMap maps contextual glyph forms incompletely. The document
renders perfectly; the text layer is not a faithful representation of it.

**Real case.** A PDF's text layer yielded 671 Arabic codepoints where the document contained
thousands — overwhelmingly combining marks, with the consonantal skeleton largely absent.
NFKC folding recovered only 838.

**Fix.** Do not attempt round-trip verification of complex scripts through PDF text extraction,
and **never report such a check as a pass or a failure**. Report it as "not checkable this way"
and inspect rendered pages visually. If you need programmatic output verification for such a
script, verify the *generated source* against the records instead, and state that this is what
you did.

---

## 10. Direction handling in typeset output

**Symptom.** Arabic or Hebrew renders with correctly shaped glyphs but the **words in reverse
order**, or the Latin text following it is reversed too.

**Cause.** The text run has the right *font* but the wrong *paragraph direction*; or a
direction switch was never closed, so following text inherits it.

**Real case.** Inline Arabic set with only a font change produced correct letterforms in
reversed word order. Separately, a block of Arabic left the enclosing paragraph in
right-to-left mode, so the English translation beneath it was rendered word-reversed —
"for] sign [a be will Jesus] [i.e., he, indeed," — while every automated check passed.

**Fix.** Use direction-aware commands for inline runs and RTL environments for blocks; close
the paragraph *inside* the environment before exiting it. Always include bidirectional text in
your visual specimen test — this class of bug is invisible to text-based checks.

---

## 11. HTML entities and apparatus markers leaking into quoted text

**Symptom.** Quoted text contains `&nbsp;`, `<sup>1</sup>`, or stray footnote digits.

**Cause.** Tag-stripping that removes elements but leaves their content, or that does not
handle entities.

**Fix.** Strip `script`/`style` blocks entirely, drop apparatus elements **with** their contents
(`<sup>…</sup>`), unescape entities, collapse whitespace. Then assert the result contains no
residual markup.

---

## 12. Comparing things that are not comparable

**Symptom.** A cross-check reports a mismatch, and investigating shows the two sources were
never carrying the same thing.

**Cause.** Comparing a text with its translation, a summary with its source, a quotation with
a paraphrase, an abstract with a full text, or two different editions of a work.

**Fix.** Make the comparison category explicit in the record. `crossCheck` should state what it
is comparing and why the two are expected to agree. If they are not expected to agree
verbatim — a translation, for instance — there is no content check to run; verify each against
its own source instead and say so.

---

## 13. Verification drifting into endorsement

**Symptom.** A report says "verified" where all that was established was "retrieved accurately".

**Cause.** Conflating retrieval with authenticity with truth (see `protocol.md`).

**Fix.** Keep the three questions separate in every report. Retrieval is what your scripts
establish. Authenticity is what the source asserts. Truth is neither. Say which you are
claiming, every time.

---

## Pre-publication checklist

- [ ] Every item in the manifest has a record; no silent omissions
- [ ] No `FAILED` or `MISMATCH` remains unresolved
- [ ] Every `RETRIEVED` item you make a claim about has at least one assertion
- [ ] Every item carrying argumentative weight is content-cross-checked against an independent source
- [ ] The published strings were **generated** from the records, and `qa-records.mjs --embeds` passes
- [ ] The build log has no missing-glyph warnings
- [ ] The document was rendered and inspected visually — including any bidirectional text
- [ ] The manifest records which sources are authoritative and which matching rungs were accepted
- [ ] Negative results and unchecked items are reported, not omitted
- [ ] The report distinguishes retrieval from authenticity from truth
