// io.mjs -- file reading that does not depend on the writer's good manners.
//
// A UTF-8 BOM is invisible in every editor and fatal to JSON.parse. Windows tooling
// (PowerShell's Set-Content -Encoding UTF8, Notepad, Excel exports) adds one by default, and
// so do some editors on save. A manifest that is perfectly valid JSON will therefore fail to
// load, and the error message ("Unexpected token '\uFEFF'") points at nothing useful.
//
// Strip it at the boundary, once, rather than debugging it per call site.

import { readFileSync } from 'node:fs';

/** Read a text file as UTF-8 with any BOM removed. */
export function readText(path) {
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
}

/** Read and parse a JSON file, tolerating a BOM. Throws a labelled error on malformed JSON. */
export function readJson(path, what = 'JSON file') {
  const raw = readText(path);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${what} ${path} is not valid JSON: ${err.message}`);
  }
}

/** Split a JSONL file into parsed records, tolerating a BOM and blank lines. */
export function readJsonl(path) {
  return readText(path)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}
