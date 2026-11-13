---
name: ghost-qa
description: Verify frontend work in a real headless browser before reporting a task complete. The autonomous Staff QA Engineer protocol — doctor readiness, multi-viewport 8-Trap baseline audit (Desktop/Tablet/Mobile, light + dark), DOM-to-source root-cause mapping, surgical remediation, and closed-loop delta verification with ghost_qa_compare until QA Health Score is 95–100 (Grade A+). Use after building or changing any UI, route, form, API integration, or client-side logic.
license: MIT
---

# 👻 ghost-qa — Autonomous Staff QA Engineer Protocol

Coding agents write code blind. Code that type-checks can still ship with React hydration mismatches, uncaught exceptions, 500ing APIs, dead links, invisible dark-mode text, 30px tap targets, and mobile layouts that scroll sideways. **The browser is the source of truth — never your mental model of the DOM.**

> **The Rule:** Before reporting ANY task that touches frontend code as complete, you MUST execute all five phases below, in order, and finish with a verified delta: QA Health Score 95–100 (Grade A+ band), zero critical/major findings, zero new regressions.

Unit tests, type-checking, linting and code review do **not** satisfy this rule. They cannot see hydration, layout, network, contrast or focus failures.

## When to use this skill

- ✅ You created or changed pages, components, routes, forms, styles, or client-side data fetching
- ✅ You fixed a bug that manifested in the browser
- ✅ You are about to tell the user a UI task is "done"

**Not a substitute for:** your unit/E2E suites, a full manual WCAG audit (the a11y trap covers machine-checkable WCAG 2.1 AA failures), load testing, or exploratory QA.

## The 8-Trap Deep Browser Inspection Engine

Every audit crawls each route on **Desktop 1440×900, Tablet 768×1024 and Mobile 375×812**, under **light + dark** colour schemes:

| # | Trap | What it catches |
| --- | --- | --- |
| 1 | Console & Framework Runtime | `pageerror`, `console.error`, unhandled rejections, React/Next.js hydration mismatches, duplicate-key warnings, CSP violations |
| 2 | Network & Asset Integrity | 4xx/5xx, timed-out/aborted requests, failed CORS preflights, broken images (`naturalWidth === 0`), broken inline SVGs (0×0), >500KB unoptimized payloads |
| 3 | Layout, Responsive Geometry & Collision | Horizontal overflow, overlapping interactive elements (bounding-box collision math), <44×44px touch targets, clipped text, off-screen interactives |
| 4 | Accessibility (WCAG 2.1 AA) & Keyboard Focus | Missing accessible names/labels/alt, heading hierarchy breaks, real computed contrast ratios, automated Tab-order verification (invisible/dead focus) |
| 5 | Performance & Core Web Vitals | TTFB, FCP, LCP, CLS, DOM bloat (>1500 nodes), DOM depth (>32), render-blocking scripts, long tasks |
| 6 | Safe Interactive & Link Integrity | Placeholder hrefs (`""`, `#`, `javascript:void(0)`), dead anchors/routes, in-form buttons without `type`, stuck disabled controls |
| 7 | SEO, Metadata & Social Graph | Title length, meta description, `<html lang>`, viewport meta, canonical, OpenGraph set, duplicate `id`s |
| 8 | Dark / Light Theme Emulation | Contrast/visibility recomputed under `colorScheme: light` and `dark` — catches invisible dark-mode text |

Scoring is deterministic: each trap starts at 100, −25 per critical, −10 per major, −3 per minor. The **QA Health Score** is the mean of the 8 trap scores, graded **A+ (97+) … F (<60)**.

---

## Phase 1 — Environment & Server Readiness (`ghost_qa_doctor`)

1. Call the **`ghost_qa_doctor`** MCP tool, or run `npx -y ghost-qa doctor`.
2. It must report **READY**: Node ≥ 20, Chromium installed, live browser smoke test passing.
3. If Chromium is missing: `npx playwright install chromium` (one-time), then re-run doctor. **Never skip to Phase 2 on a red doctor** — a failed launch is not a passing audit.
4. Start the app (`npm run dev`) or plan to use `--server-cmd "npm run dev"` / let the audit spawn it.

## Phase 2 — Multi-Viewport 8-Trap Baseline Audit (`ghost_qa_audit_url`)

Run the baseline BEFORE changing code (or before your fix, when debugging):

- MCP: call **`ghost_qa_audit_url`** with the app URL. Save the full returned report JSON as **`before.json`**.
- CLI equivalent: `npx -y ghost-qa test <local-url> --out-dir ghost-qa-out` → writes `report.json` (copy to `before.json`), `GHOST-QA-REPORT.md`, `PATCH-PROMPT.md`, and the interactive `report.html` dashboard. Add `--screenshots` for embedded route screenshots; `--server-cmd "npm run dev"` if the server isn't running.

Record the baseline: **QA Health Score, grade, per-trap scores, and every finding's `#id`.** Common local URLs: Next.js/CRA `http://localhost:3000`, Vite `http://localhost:5173`, Astro `http://localhost:4321`, Angular `http://localhost:4200`. Never guess silently — state the URL you verified.

## Phase 3 — DOM-to-Source Root-Cause Mapping

For every critical/major finding, trace it back to the exact source component before editing:

- **Exact selectors:** findings carry `#id`, `[data-testid=…]`, or a CSS path, plus the live **bounding box**. Search the codebase for that id/testid/class or the element's visible text to find the React/Next.js/Vue/Svelte component that renders it.
- **Collisions/overflow:** the two colliding selectors + boxes tell you which siblings overlap — inspect their flex/grid/absolute layout in that component, on the failing viewport.
- **Console stacks:** follow the first app-owned stack frames to the throwing component/effect. Hydration mismatches mean server and client rendered different markup (Date/random/`window` at render, invalid nesting like `<p>` in `<p>`).
- **Dark-mode contrast:** a `theme-contrast` finding names the scheme that fails — find the hard-coded colour in that component and replace it with the theme token.
- **Network:** map the failing URL to its route handler/client fetch; 5xx is server code, CORS preflight is API config.

Write the mapping down (finding `#id` → file → root cause) before Phase 4. If you cannot map a finding, say so — do not guess-fix.

## Phase 4 — Surgical Code Remediation

Fix root causes, one finding at a time, in severity order (critical → major → minor):

- **Hydration:** identical server/client markup; defer client-only values to effects; fix invalid HTML nesting. Never `suppressHydrationWarning` to silence it.
- **Responsive geometry:** `min-width: 0` on flex/grid children, `max-width: 100%`, no `100vw` + scrollbar overflow, reserve image space with width/height or `aspect-ratio` (also fixes CLS).
- **Tap targets:** every touch target ≥ 44×44px (padding or min-height/min-width).
- **ARIA/labels:** visible text or `aria-label` on icon controls, `<label for>` (or wrapping label) per input, `alt` on images (`alt=""` only if decorative), one `<h1>`, no heading level skips, visible `:focus-visible` rings — never `outline: none` without a replacement.
- **Dark-mode tokens:** CSS variables / `dark:` variants driven by `prefers-color-scheme` or the app theme — never hard-coded hex that only works in one scheme.
- **Links/forms:** real hrefs or `<button type="button">`; dead anchors get real targets; in-form buttons get explicit `type`.
- **Performance:** defer/async non-critical scripts, compress/resize/lazy-load >500KB assets, code-split, break up long tasks.

**Anti-cheating rules (absolute):** never delete failing UI, never loosen the checker, never hide elements from the traps, never stub network responses. Fixing the checker instead of the bug is a failed task.

## DOM-to-Component Fix Playbooks (the failures you will actually meet)

Use these in Phase 4. Each playbook starts from what the report hands you — **selector + bounding box + viewport + trap** — and ends at the component you must edit. Never guess: reproduce with the selector first (`document.querySelector('<selector>')` in DevTools), then find its source component by searching for the id / `data-testid` / class / visible text.

### Playbook A — Mobile horizontal overflow (`scrollWidth > innerWidth`) · Trap 3 (Layout)

**Signature:** `horizontal-overflow` on mobile/tablet; the finding names the overflowing elements and their boxes (right edge ≫ 375 or 768).

1. The element whose bounding box `x + width` exceeds the viewport width is your culprit — open its component.
2. Hunt the usual causes, in this order: a fixed pixel width (`w-[500px]`, `width: 500px`), `100vw` on an element inside a padded/scrollable ancestor (adds the scrollbar width), a flex/grid child that refuses to shrink, negative margins, or an absolutely-positioned decorative blob.
3. **Fix at the component:** let flex/grid children shrink and cap widths instead of forcing them:
   - Tailwind: add `min-w-0` to the flex/grid child, `max-w-full` on the wide element, and replace `w-screen`/`100vw` with `w-full`. For text that must not push layout: `truncate` or `break-words`.
   - Vanilla CSS: `min-width: 0` on the flex item, `max-width: 100%`, `box-sizing: border-box`, and `overflow-x: clip` on the *page shell only as a last-resort guardrail* — masking with `overflow-x: hidden` on `body` without fixing the child is cheating: the trap also flags the still-overflowing element's box.
4. Re-check the same selector's box at 375×812 in the delta run: its right edge must be ≤ viewport width on every viewport.

### Playbook B — Bounding-box button collisions (overlapping interactives) · Trap 3 (Layout)

**Signature:** `element-collision` naming **both** selectors and the first element's bounding box; the two boxes intersect by > 4px in both axes.

1. Inspect both components. Overlaps almost always come from: a floating action button / chat bubble positioned over a CTA, a sticky header covering anchored content, a badge/avatar absolutely positioned beyond its parent, or two elements competing in the same grid cell.
2. **Fix the stacking, not the checker:** give the layout room to breathe — move the floater (`bottom-24` instead of `bottom-4` over a footer CTA), add scroll-margin to anchored sections (`scroll-mt-24`), place the badge inside flow (`relative` parent + contained offsets that don't cross the neighbouring control), or assign explicit grid areas so siblings can't share a cell. If one element is *supposed* to overlay (modal, tooltip), the interactive element beneath must not remain clickable — `pointer-events-none` on the covered control or trap focus inside the modal.
3. Done when the delta shows the collision gone on **every** viewport — collisions often exist only at 375px where the layout compresses.

### Playbook C — Touch targets `< 44×44px` without breaking desktop density · Trap 3 (Layout)

**Signature:** `small-touch-target` with the exact box (e.g. `38×20px`) on mobile/tablet. Desktop has no such requirement — dense desktop UIs are fine, so **fix responsively, never globally**.

1. Find the component by selector. Icon buttons, compact table-row actions, pagination links and chip close-buttons are the repeat offenders.
2. Grow the *hit area*, not necessarily the visual: padding and min-size on touch viewports, relaxing at `md:` where density is welcome:
   - Tailwind icon button: `class="inline-flex items-center justify-center min-h-11 min-w-11 md:min-h-9 md:min-w-9"` — 44px (11 × 4px) on mobile, 36px on desktop. Keep the icon itself small (`h-5 w-5`); it's the target that must be 44px.
   - Text links in lists/menus: `class="inline-flex items-center min-h-11 md:min-h-9 px-2"`.
   - Vanilla CSS: `min-height: 44px; min-width: 44px;` inside `@media (pointer: coarse)`, or expand with a pseudo-element hit-slop (`position: relative` + `::after { content:""; position:absolute; inset:-10px; }`) when visual spacing is locked by design.
3. **Anti-patterns:** scaling the whole UI up on mobile, `zoom`, or making desktop airy to satisfy a mobile rule. Verify: trap silent at 375×812 and 768×1024, desktop rendering unchanged.

### Playbook D — Invisible dark-mode text · Trap 8 (Theme Parity)

**Signature:** `theme-contrast` tagged `colorScheme: dark` (or `light`), with selector, ratio (e.g. `1.3:1, needs 4.5:1`) and box. The text is perfectly visible in *your* theme — that's the trap working as intended.

1. Reproduce: DevTools → Rendering → emulate `prefers-color-scheme: dark`, then inspect the selector. You'll find a hard-coded colour: `color: #111`, `text-neutral-900`, an inline style, or an SVG `fill` that never flips — sitting on a background that *does* flip.
2. **Fix with theme tokens at the component, never a one-off hex swap:**
   - Tailwind: pair every colour with its dark variant — `text-neutral-900 dark:text-neutral-100`, `bg-white dark:bg-neutral-900`, `border-neutral-200 dark:border-neutral-800`. If you find yourself writing a bare `text-black`/`bg-white` inside a themed surface, that's the bug.
   - CSS variables (design-token setups): define semantic tokens per scheme — `:root { --ink: #111827; --surface: #ffffff; }` and `@media (prefers-color-scheme: dark) { :root { --ink: #f3f4f6; --surface: #111827; } }` (or under your `[data-theme="dark"]` selector), then consume `color: var(--ink); background: var(--surface);`. Check images/SVGs too: `fill: currentColor` inherits the fixed token.
   - Framework themes (next-themes, MUI, Chakra…): use the theme's text/background tokens (`text.primary`, `bg.paper`) instead of palette literals.
3. Check **both** directions: a fix that only darkens dark-mode text can create a light-mode failure. The delta must show Trap 8 silent under *both* schemes, and Trap 4 (computed contrast) still clean.

### Playbook E — React/Next.js hydration mismatches · Trap 1 (Console & Framework Runtime)

**Signature:** `hydration-mismatch` (critical) with the first stack frames. Server HTML and first client render disagree — React discards the server DOM and re-renders, causing flicker and, in Next.js, hard errors.

1. Read the diff text in the finding ("Text content did not match", "A tree hydrated but…"). The first app-owned stack frame names the component.
2. Usual root causes, in order: rendering `Date.now()` / `new Date()` / `Math.random()` / locale-formatted dates during render; reading `window`/`localStorage`/cookies during render; user-agent or viewport-dependent markup; invalid HTML nesting the browser "fixes" differently from React (`<p>` inside `<p>`, `<div>` inside `<p>`, `<table>` without `<tbody>`, nested `<button>`/`<a>`); extensions injecting attributes (suppress *only* those, on the exact element, with a comment).
3. **Fix by making first render deterministic and identical on both sides:**
   - Client-only values: compute in `useEffect` + state, or lazy-init from an effect — never during the server render. Dates: format on the server and pass as props, or render a stable placeholder that fills in after mount.
   - Client-only components: `next/dynamic` with `ssr: false`, or a mounted-gate (`const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`) — keep the gate as small as possible so the rest of the page still SSRs.
   - Fix the nesting: `<div>`/`<section>` instead of `<p>` wrappers, real `<tbody>`, one interactive element per control.
4. **Forbidden:** adding `suppressHydrationWarning` to silence the trap (except the single-element browser-extension case above), deleting the dynamic content, or forcing `ssr: false` on whole pages to make the error disappear.
5. Verify: Trap 1 silent on **all three viewports** (hydration is viewport-independent — if it only fires on one, suspect viewport-dependent markup) and no new `console-error` friends in the delta.

## Phase 5 — Closed-Loop Delta Verification (`ghost_qa_compare`)

1. Re-run the identical audit (same URL/viewports) → save as **`after.json`**.
2. Compare: MCP **`ghost_qa_compare`** with `{ before, after }`, or `npx -y ghost-qa compare before.json after.json`.
3. Read the **Regression & Verification Delta Report**: `scoreDelta`, `fixedFindings`, `newRegressions`, `remainingFindings`.
4. **Done only when ALL hold:** QA Health Score **95–100 (Grade A+ band)** · zero critical/major remaining · **zero new regressions** (`verified: true`). Otherwise loop back to Phase 3 with the delta as your new worklist.
5. If the same `#id` survives 5 loops, stop and report honestly what you tried — never declare success on a red delta.

## Completion report (required format)

> ✅ Done. Verified in a real browser with ghost-qa: `ghost_qa_audit_url` on `<url>`
> Stack: Desktop 1440×900 + Tablet 768×1024 + Mobile 375×812, light + dark, 8 traps
> QA Health Score: `<before>` → `<after>` (Grade `<grade>`) · Delta: `<n>` fixed, 0 new regressions
> Routes crawled: `<n>` · Interactions tested: `<n>` · Artifacts: `report.json`, `GHOST-QA-REPORT.md`, `PATCH-PROMPT.md`, `report.html`

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "could not launch Chromium" | `npx playwright install chromium` (one-time), then `npx -y ghost-qa doctor` |
| Navigation failures on every route | The dev server isn't running (or wrong port) — start it, or use `--server-cmd "npm run dev"` |
| Score stuck below 95 | Work the delta's remaining findings by severity; re-check Phase 3 mapping before editing |
| A trap flags a healthy page | File an issue with `report.json` attached — false positives are the most valuable bug reports |

> All commands use the published npm package (`npx -y ghost-qa …`). If npm is unavailable, `npx -y github:avivgerz-hue/ghost-qa …` runs the identical CLI straight from GitHub.
