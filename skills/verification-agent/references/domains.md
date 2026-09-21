# Domain Playbooks

The protocol is general; the sources are not. Each playbook gives the canonical sources, the
profile, the rung to accept, and the pitfalls that recur in that domain.

---

## Scripture and religious texts

**Canonical sources.** Use the database that owns the text and cites its own editions —
e.g. Quran.com for the Qur'an (Uthmani script, published translations, classical commentaries),
Sunnah.com for ḥadīth (Arabic, translation, published grading), Sefaria for Jewish texts,
Perseus or a critical edition for classical Greek and Latin.

**Profile.** The script's own (`arabic`, `hebrew`, `greek`). Always. Sacred texts are fully
vocalised, and comparison must be invariant to the marks — but never to the letters.

**Rung.** Cross-source: `content-match`. The same tradition transmitted through different
chains shares its core text and differs in its apparatus.

**Pitfalls.**

- **Numbering differs between collections and editions.** Sunnah.com's `muslim:155` is a bulk
  corpus's `muslim:389`; that corpus's `muslim:155` is an unrelated narration. Content-address
  every cross-check.
- **Probe the content, not the chain.** A probe drawn from a citation chain (isnād) matches
  every report on that chain. Probe the narrative.
- **A reading (qirāʾa) is not a typo.** Variant readings are reported, attributed to named
  authorities, and often differ only in vocalisation — which mark folding erases. If the
  distinction matters, compare under `identity` or with the marks intact, and cite the
  authority who reports the variant.
- **A grading belongs to the grader.** "Ṣaḥīḥ (al-Albānī)" is al-Albānī's assessment, not a
  property of the text. Record grades verbatim with the grader's name, and note that gradings
  disagree between editors of the same collection.
- **Translations are not the source.** Verify a translation against the translation, and the
  original against the original. Never compare one to the other and call it a check.

---

## Bibliography, citation and DOIs

**Canonical sources.** Crossref (DOI resolution), OpenLibrary or a national library catalogue
(books), PubMed (biomedical), arXiv (preprints), the publisher's own landing page.

**Profile.** `latin`.

**Rung.** Self-integrity: `normalized`. The title must match the catalogue exactly, not merely
overlap.

**Pitfalls.**

- **Verify against a catalogue, not a search engine.** A title query returns the *most popular*
  edition with that name, which is frequently not the one you cited.
- **Editions, translators and years differ.** Record the edition you verified. "First published
  1932" and "this edition 2011" are both true and neither is the citation.
- **DOIs resolve or they do not.** A DOI that returns "Resource not found" is a `FAILED`
  record, not a formatting nicety — check it before publication, not after.
- **Predatory and hijacked journals** reuse real titles on lookalike domains. Verify the DOI
  resolves at the publisher, not merely that a page with that title exists.

---

## Statistics, figures and quotations in news and reports

**Canonical sources.** The originating dataset or agency release (statistical office, central
bank, registry, peer-reviewed paper), not the article reporting it.

**Profile.** `numeric` for the figure; `latin-alnum` for the surrounding quotation.

**Rung.** Numeric: `identity` on the normalised digits. Quotation: `latin-alnum` with
`content-match`, and read the run length — a quotation that shares only half its words is a
paraphrase being presented as a quotation.

**Pitfalls.**

- **Telephone numbers.** A figure quoted in a news article usually traces to a release with
  different framing, a different period, or a revision. Verify at the origin and check the
  period and units.
- **A quotation lifted mid-sentence.** Verify the whole sentence, not the fragment. Elision
  changes meaning more often than fabrication does.
- **Translation of a quotation.** Verify against the original language where possible; a
  translated quotation is a secondary source.
- **Survivorship in what you can check.** Figures that are easy to verify (press releases) are
  systematically friendlier than figures that are not (internal datasets). Note the asymmetry.

---

## Code, APIs and technical documentation

**Canonical sources.** Versioned official documentation, the source repository at a pinned tag
or commit, a package registry (npm, PyPI, crates.io), an RFC or specification document.

**Profile.** `identity` or `unicode`. Code is exact; folding is how you cite an API that does
not exist.

**Rung.** `exact`.

**Pitfalls.**

- **Documentation is versioned and drifts.** Pin the version and record it. `latest` is not a
  citable source.
- **A registry's metadata is not the package.** Verify a claim about behaviour against source
  at a commit, not against a README.
- **Deprecation and removal.** A function present in one major version is absent in the next.
  Record the version alongside the quotation.
- **Line numbers move.** Cite a commit hash plus a searchable string, not "line 412".

---

## Standards, legal and regulatory material

**Canonical sources.** The issuing body's own register (legislation portal, standards
organisation, regulator). A consolidated version where one exists; the as-enacted text where
the question is about original intent.

**Profile.** `identity` for operative text; `latin` for commentary.

**Rung.** `exact` for quoted operative language.

**Pitfalls.**

- **Amendments.** A section may have been amended or repealed after the version you read.
  Verify against the consolidated text **as at a stated date**, and record that date.
- **Jurisdiction and commencement.** The same short title exists in multiple jurisdictions,
  and an Act may commence in stages.
- **Summaries are not the instrument.** A regulator's guidance page describing a rule is not
  the rule. Verify operative language against the instrument.
- **This is not legal advice.** Verify that a text says what it is claimed to say; do not
  present retrieved text as an interpretation of its effect.

---

## Scientific and medical claims

**Canonical sources.** The paper's DOI landing page, the trial registry entry
(ClinicalTrials.gov, ISRCTN), the retraction database (Retraction Watch), the journal's own
correction notices.

**Profile.** `latin`.

**Rung.** `normalized` for titles and abstracts; `content-match` for quoted sentences.

**Pitfalls.**

- **Check retraction and correction status first.** A retracted paper is a `MISMATCH` against
  the current literature regardless of how accurately it was retrieved.
- **Abstract versus full text versus press release.** Three different claims. Verify the one
  you are actually making, against the artefact that supports it.
- **Preprints are not peer-reviewed.** Record the status.
- **Effect sizes and units.** Verify the number *with its units and interval*, not the bare
  figure. A figure without its confidence interval is a claim without its uncertainty.

---

## Cross-domain summary

| Domain | Profile | Rung to accept | Non-negotiable |
|---|---|---|---|
| Scripture | script-specific | `content-match` (cross-source); `contains` (assertion) | Content-address, never number-match |
| Bibliography | `latin` | `normalized` | Verify at a catalogue, record the edition |
| Statistics / quotes | `numeric`, `latin-alnum` | `identity` (figures), `content-match` (prose) | Trace to the originating release |
| Code / APIs | `identity` | `exact` | Pin the version |
| Standards / legal | `identity` | `exact` | Consolidated text as at a stated date |
| Science / medicine | `latin` | `normalized` | Check retraction status first |

In every domain the same three questions stay separate: did I retrieve it accurately (your
scripts), does the source stand behind it (the source's claim), and is it true (neither).
