# Providers

A provider is a declarative description of how to ask one source for one thing, and where the
text sits in the answer. Most sources need a URL template and a field pointer. Write code only
when a source genuinely resists description.

## Provider spec

```jsonc
{
  "description": "what this gives you",
  "mode": "json",                  // "json" | "html" | "text"
  "url": "https://host/path/{param}{other|url}",  // {x} raw, {x|url} percent-encoded
  "headers": { "Accept-Language": "en-US,en;q=0.9" },
  "extract": [ /* field specs, below */ ],
  "profile": "arabic"              // default comparison profile for this source
}
```

Locator parameters come from the manifest entry and fill the URL template. A missing parameter
is a hard error, not an empty string — silent blanks are how bad records are born.

### Field specs

**JSON mode**

| Key | Meaning |
|---|---|
| `as` | Field name in the record |
| `array` | Dotted path to an array in the response body |
| `where` | `{fieldPath: "{param}"}` — filter the array (templates resolved) |
| `value` | Dotted path to extract from the selected element |
| `path` | Dotted path to extract from the root, when there is no array |

**HTML / text mode**

| Key | Meaning |
|---|---|
| `as` | Field name |
| `regex` | Regular expression; should contain one capture group |
| `group` | Capture group index (default 1) |
| `flags` | e.g. `i`, `s` |
| `all` | Return every match instead of the first |
| `longest` | With `all`, keep the longest match — used when a class appears on both a label cell and its value cell |

Extracted values pass through context-free cleanup (tag stripping, entity unescaping,
whitespace collapsing) before any profile is applied.

### Transport

The fetcher sends browser headers and retries with `curl` on `403`/`406`/`429` or a transport
error, because hosts frequently discriminate against library clients while serving browsers
normally. Which transport succeeded is recorded in `fetchedVia` on every record — a reader
reproducing your check needs that. Disable with `--no-curl-fallback`.

## Adding a provider

Worked example — a REST API returning a nested object:

```
GET https://api.example.org/v2/works/{id}
→ { "data": { "attributes": { "title": "…", "issued": "1844" } } }
```

```json
{
  "example-work": {
    "description": "Example catalogue work record",
    "mode": "json",
    "url": "https://api.example.org/v2/works/{id}",
    "headers": { "Accept": "application/json" },
    "extract": [
      { "as": "text",  "path": "data.attributes.title" },
      { "as": "year",  "path": "data.attributes.issued" }
    ],
    "profile": "latin"
  }
}
```

Save it to a file and pass `--providers extra.json`; user providers merge over the built-ins.
Verify immediately with a one-entry manifest — a provider that has never produced a record is
not a provider, it is a hope.

**HTML scrape** — locate a stable marker, then bound the match on both sides:

```json
{
  "example-page": {
    "mode": "html",
    "url": "https://example.org/{slug}",
    "extract": [
      { "as": "text",
        "regex": "<div class=\"entry-content\">([\\s\\S]*?)(?=<footer|<div class=\"comments)",
        "group": 1 }
    ],
    "profile": "latin"
  }
}
```

A non-greedy match terminated by a closing tag fails the moment the content nests. Terminate
on the *next known block*, not on a tag.

## Built-in providers

| Provider | Mode | Gives |
|---|---|---|
| `quran-uthmani` | json | Qur'anic text, Uthmani script, fully vocalised |
| `quran-translation` | json | Published translation by resource id (20 Saheeh Intl, 85 Abdel Haleem, 84 Usmani, 19 Pickthall, 22 Yusuf Ali) |
| `quran-tafsir` | json | Classical commentary by resource id (169 Ibn Kathīr EN abridged; 15 al-Ṭabarī AR; 90 al-Qurṭubī AR; 14 Ibn Kathīr AR) |
| `sunnah` | html | Ḥadīth Arabic, English rendering and published grading; locator `{path}` = `bukhari:3448` or `malik/56/4` |
| `hadith-api-record` | json | Single record from an independent bulk hadith corpus |
| `openlibrary-search` | json | Bibliographic metadata by title/author query |
| `crossref-doi` | json | Journal/article metadata by DOI |
| `wikipedia-summary` | json | Encyclopaedia summary by title and language |
| `generic-json` | json | Any JSON endpoint; edit `extract` |
| `generic-html` | html | Any HTML page with a single capture group |

The scripture providers are the ones used to build a verified academic report; they are
examples of the pattern, not its limit.

## Corpus specs

A corpus is a whole dataset plus pointers to index it by content. Use it whenever the second
source does not share the first source's numbering — the normal case.

```json
{
  "hadith-api-book": {
    "description": "Whole book of the hadith-api corpus, indexed by content",
    "url": "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{edition}.min.json",
    "array": "hadiths",
    "id": "hadithnumber",
    "text": "text",
    "profile": "arabic"
  }
}
```

```bash
node scripts/content-index.mjs build --corpus hadith-api-book --locator edition=ara-bukhari
node scripts/content-index.mjs find  --corpus hadith-api-book --locator edition=ara-bukhari \
     --probe "@matn.txt"
```

Indexes are cached under the system temp directory; rebuilding costs one download per dataset.

## Choosing a source

Prefer, in order:

1. **The primary publisher or database** — the body that issues the text, the registry that
   holds the record, the journal that published the paper.
2. **An institutional mirror** of the same edition.
3. **A bulk dataset of the same edition**, used for content cross-checking.
4. **An aggregator**, clearly labelled as one.

Never: a search-engine snippet, a content farm, an unattributed repost, or an AI summary.
These are how misquotation propagates, and they cannot be cited reproducibly.

Two heuristics that save trouble:

- **Prefer a documented API to a scrape.** APIs are stable and give structure; scrapes break
  silently when markup changes.
- **Prefer a stable identifier to a search.** A DOI beats a title query, which can resolve to
  the wrong edition with a similar name.

## Provider anti-patterns

- **Scraping a JavaScript-rendered page.** The HTML you fetch will not contain the data. Find
  the underlying API — almost always present — or a bulk export.
- **Trusting a search endpoint as a source.** Search tells you where to look; it is not the
  thing you cite.
- **Extracting with one unbounded regex.** See failure mode 6.
- **Ignoring the retrieval transport.** If a source blocks your client, that fact belongs in
  the record; a reader reproducing your work will otherwise conclude the source is unavailable.
- **Assuming field names.** APIs return `resource_name` on the object in one place and
  `meta.translation_name` in another. Print the raw response once before writing the spec.
