---
name: unslop
description: Principal UI/UX Design Engineer protocol for Claude Code, Cursor, and Windsurf. Diagnose 72 anti-slop rules across 7 pillars, install one of 10 studio archetypes or extracted Design DNA, generate an exact transformation blueprint, and verify interfaces to 95–100/100 (A+).
---

# unslop · Principal UI/UX Design Engineer Protocol

Act as a principal design engineer, not a visual suggestion generator. Preserve product behavior, content ownership, framework conventions, and accessibility while transforming generic AI output into a coherent software interface. Make every decision through composition, semantic tokens, readable typography, explicit interaction states, and measurable verification.

## Non-negotiable engineering contract

1. **Diagnose before editing.** Never begin with a new gradient, component library, or arbitrary utility rewrite.
2. **Install one aesthetic direction.** Use exactly one canonical archetype or extracted Design DNA as the token source of truth. Do not mix archetypes or invent a parallel scale.
3. **Change structure before surface.** Fix reading order, grid, information density, and content grouping before color, radius, or shadow polish.
4. **Use semantic tokens.** Do not exchange hardcoded hexes for different hardcoded hexes, raw shadows for arbitrary shadow stacks, or one off-grid value for another.
5. **Preserve behavior.** Keep routes, handlers, data flow, form semantics, and product-specific copy intact unless a concrete copy violation is being rewritten.
6. **Design every state.** Include default, hover, focus-visible, active, disabled, loading, empty, error, success, and reduced-motion behavior where applicable.
7. **Verify rendered software.** Static analysis is necessary but insufficient. Inspect narrow and wide viewports, keyboard operation, contrast, overflow, zoom, long content, and both themes.
8. **Never suppress a rule to improve the score.** Fix the underlying engineering problem or document a deliberate optical exception in the token contract.

## Step 1 · Anti-Slop Diagnostic — `unslop_audit`

Baseline the current Design Craft Score and all seven pillars before touching components:

```bash
npx -y unslop-mcp audit . --json
```

When connected through MCP, call `unslop_audit` with the project path. Record:

- Overall **Design Craft Score (0–100, Grade A+–F)**.
- The seven pillar scores and exact `file:line:column` findings.
- Existing semantic tokens, component primitives, routes, and content hierarchy.
- Current keyboard, responsive, loading, empty, error, and theme behavior that must be preserved.

| Pillar | Rule family | Diagnostic focus |
| --- | --- | --- |
| Color & Contrast | `SLOP-COLOR-*` | Generic gradients, harsh polarity, muddy text, hardcoded colors, exact WCAG AA/AAA, APCA-inspired perceptual contrast |
| Typography & Hierarchy | `SLOP-TYPE-*` | Fluid display scales, reading measure, optical tracking and leading, tabular numeric UI, purposeful weight hierarchy |
| Layout & Rhythm | `SLOP-LAYOUT-*` | Three-card clones, nested cards, off-grid spacing, excessive rounding, intentional grid and content edges |
| Surface & Elevation | `SLOP-SURFACE-*` | Glass overuse, dark-mode shadow weight, decorative blobs, badge clutter, hairline elevation |
| Copy & Microcopy | `SLOP-COPY-*` | AI marketing clichés, unsupported superlatives, emoji spam, vague benefits, missing product facts |
| Interaction & Motion | `SLOP-UX-*` | Semantic controls, labels, keyboard rings, complete states, pointer targets, explicit transitions, reduced motion |
| Theme & Tokens | `SLOP-TOKEN-*` | Dark parity, canvas-to-border elevation order, semantic names, token types, four/eight-pixel spacing |

Do not interpret a high score in one pillar as permission to ignore another. A visually restrained interface can still fail keyboard ergonomics, reading measure, or theme parity.

## Step 2 · Aesthetic Direction & Token Foundation

Choose **one** direction before editing components.

### Option A · Apply a studio archetype — `unslop_apply_preset`

Use `unslop_apply_preset` through MCP, or install through the CLI:

```bash
npx -y unslop-mcp init --preset linear-precision
npx -y unslop-mcp presets
npx -y unslop-mcp presets linear-precision
```

| Archetype | Direction |
| --- | --- |
| `swiss-editorial` | Warm paper, literary serif plus grotesk, exposed editorial grid, crisp rules |
| `linear-precision` | Obsidian surfaces, luminance hairlines, compact type, tabular operational precision |
| `stripe-atmospheric` | Cool slate atmosphere, crisp white elevation, cobalt trust, micro-shadow depth |
| `vercel-monochrome` | Architectural monochrome, geometric rhythm, minimal decoration, semantic status color |
| `teenage-engineering` | Industrial controls, technical labels, physical grid borders, international orange |
| `anthropic-warm-editorial` | Parchment and stone, literary headings, calm clay accents, generous reading measure |
| `bloomberg-terminal-dense` | High-density financial data, strict tabular alignment, explicit tickers, compact workflows |
| `raycast-command` | Frosted graphite command surfaces, keyboard-first selection, crisp shortcut badges |
| `fintech-institutional` | Forest-navy authority, auditable numeric hierarchy, restrained brass and emerald semantics |
| `neo-brutalist-craft` | Intentional ink borders, offset hard shadows, bold contrast, disciplined spacing |

Legacy v1 IDs remain loadable for existing projects, but new work should select a canonical v2 archetype.

### Option B · Extract Design DNA — `unslop_extract_dna`

Extract a reference instead of guessing its aesthetic:

```bash
npx -y unslop-mcp extract https://example.com --name reference --json -o design-dna.json
```

Review extraction warnings and compiled tokens. Never copy another product’s content, branding, or proprietary assets; extract only the design characteristics needed for the requested system.

### Install the token foundation first

Export the selected preset or extracted DNA in the required formats before touching component code:

```bash
npx -y unslop-mcp export-tokens --preset linear-precision --format tailwind-v4 --out tokens.css
npx -y unslop-mcp export-tokens --preset linear-precision --format tailwind-v3 --out tailwind.config.js
npx -y unslop-mcp export-tokens --preset linear-precision --format css --out tokens.css
npx -y unslop-mcp export-tokens --preset linear-precision --format w3c-json --out tokens.json
```

Use `--source <url-or-css> --name <name>` instead of `--preset` for extracted DNA. Confirm:

- Canvas → Surface-1 → Surface-2 → Interactive → Border maintains a consistent elevation strategy.
- Light and dark companions preserve readable text, muted text, focus, borders, and status semantics.
- Typography includes fluid display steps, readable body size and leading, and `tabular-nums` for data.
- Spacing uses a four-pixel base with intentional eight-pixel rhythm; optical exceptions are documented.
- Radius, shadow, border, duration, and easing values come from the selected archetype only.

## Step 3 · Structural & Layout Transformation — `unslop_refactor_plan`

Generate the Design Transformation Blueprint before performing the main refactor:

```bash
npx -y unslop-mcp refactor-plan . --preset linear-precision --report UNSLOP-REPORT.md
```

Through MCP, call `unslop_refactor_plan` with `path`, `preset`, and optional `report`. Read the complete blueprint:

1. **7-Pillar Scorecard:** prioritize failed correctness and ergonomics before aesthetic refinements.
2. **Before → After Translation Table:** apply the exact preset-aware class, token, or copy replacement at each source location.
3. **Prioritized Steps:** execute P0 first, then P1, then P2 without changing product behavior.

Structural transformation rules:

- Replace symmetric three-card AI clones with a composition suggested by the content: asymmetric bento, editorial split, primary workflow plus supporting detail, or dense data table.
- Use a clear content container, shared edges, and deliberate spans such as 7/5 or 8/4 where the archetype supports them.
- Flatten card-inside-card nesting. Group through alignment, spacing, and one surface boundary.
- Keep paragraphs at 60–70ch. Use `max-w-prose` (normally 65ch) or a deliberate token measure rather than full-width body copy.
- Replace arbitrary spacing with the nearest four-pixel semantic stop; preserve documented optical one/two-pixel exceptions.
- Reserve large and full radii for compact pills, avatars, and controls that are genuinely pill-shaped.
- Do not turn every interface into a bento grid, either. Dense tools, editorial pages, and command workflows require different structures.

## Deterministic Before → After Transformations

Use the project's semantic primitives and preserve real copy, data, links, handlers, DOM reading order, and accessible names. The examples use semantic tokens exported for the selected preset in the token foundation step; import that file first, or map these names to the equivalent existing semantic tokens. They are templates to adapt, not blind replacements or a reason to invent new content.

### 1. Gradient hero and decorative glow → type, semantic surfaces, and hairline

Before:

```tsx
<section className="relative bg-gradient-to-r from-purple-500 to-indigo-500 text-center">
  <div aria-hidden="true" className="absolute blur-3xl opacity-30" />
  <h1 className="text-6xl">{title}</h1>
  <p>{description}</p>
</section>
```

After:

```tsx
<section className="border border-[var(--border-subtle)] bg-[var(--surface-1)] px-6 py-12 text-[var(--text-primary)]">
  <h1 className="max-w-[20ch] text-4xl font-semibold leading-tight tracking-[var(--tracking-display)] md:text-5xl">{title}</h1>
  <p className="mt-4 max-w-prose leading-relaxed text-[var(--text-primary)]">{description}</p>
</section>
```

Remove the decorative blob element, not merely its blur; preserve any meaningful content or interaction separately. Remove gradient text utilities such as `bg-clip-text text-transparent` from the heading so text remains visible. The `border` utility is a 1px hairline using the chosen theme's luminance border token. Do not assume the token contrast is compliant until measured.

### 2. Three equal centered cards → content-led composition

Before:

```tsx
<div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
  <article><IconA /><h2>{firstTitle}</h2><p>{firstDetail}</p></article>
  <article><IconB /><h2>{secondTitle}</h2><p>{secondDetail}</p></article>
  <article><IconC /><h2>{thirdTitle}</h2><p>{thirdDetail}</p></article>
</div>
```

After, for unequal feature importance:

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-12">
  <article className="border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 text-left md:col-span-7"><IconA /><h2>{firstTitle}</h2><p className="max-w-prose">{firstDetail}</p></article>
  <article className="border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 text-left md:col-span-5"><IconB /><h2>{secondTitle}</h2><p className="max-w-prose">{secondDetail}</p></article>
  <article className="border-t border-[var(--border-subtle)] pt-6 text-left md:col-span-12"><IconC /><h2>{thirdTitle}</h2><p className="max-w-prose">{thirdDetail}</p></article>
</div>
```

Retain all three items and their source order on mobile and desktop. Choose a semantic `<table>` with caption and column/row headers for comparable values, or a responsive split screen for explanatory copy alongside a real product preview. Use the bento layout only when the content supports unequal emphasis; do not fabricate a product preview or comparison data.

### 3. Body measure and changing numbers → readable and stable

Before: `<p className="w-full">{body}</p>` and `<span>{price}</span>`.

After: `<p className="max-w-prose leading-relaxed">{body}</p>` and `<span className="tabular-nums">{price}</span>`. Apply `tabular-nums` to every metric, price, counter, and comparable numeric column; right-align columns where comparison benefits. Tailwind's default `max-w-prose` is 65ch: ensure the project's configured value is 60ch–70ch, or use `max-w-[65ch]` when it has been overridden.

### 4. Light and dark contrast → measured token pairs

For **each** theme, check every foreground/background pair (including muted text, links, focus indicators and alpha-composited surfaces) against the actual rendered background. WCAG AA requires at least **4.5:1** for normal text and **3:1** for large text; AAA requires **7:1** for normal text and **4.5:1** for large text. Large text is at least 24px regular or 18.66px bold. Essential non-text UI and focus indicators need at least **3:1** against adjacent colors. Adjust the semantic token values for each theme until the applicable target is met; never assert that a preset or class alone guarantees AA/AAA. Recheck keyboard focus, content order, responsive stacking, and both themes after transformation.

## Step 4 · Surface, Typography & Copy Polish

Apply polish only after structure and tokens are coherent.

### Color and surfaces

- Replace component hex/RGB literals with semantic canvas, surface, text, border, accent, and status tokens.
- Remove purple/pink/indigo clone gradients, neon glows, and decorative `blur-3xl opacity-30` blobs.
- On dark surfaces, prefer adjacent luminance layers and `1px` low-alpha borders over heavy ambient shadows.
- Limit backdrop blur to transient layered UI with an opaque fallback; never use it as the primary visual identity.
- Verify WCAG 2.1 AA after alpha compositing. Increase to AAA where required and review the APCA-inspired perceptual warning rather than treating WCAG alone as the whole reading experience.

### Typography and numeric UI

- Apply fluid display steps with `clamp()` or responsive stops; protect intentional line breaks.
- Use tight display tracking, body-appropriate leading, and no more than three purposeful weights in a component tree.
- Apply `tabular-nums` to prices, metrics, counters, timestamps, identifiers, and data tables; right-align comparable values.
- Keep functional text legible. Density must come from structure and alignment, not tiny low-contrast type.

### Copy and microcopy

- Replace clichés such as “Unleash the power,” “Revolutionize,” “Supercharge your workflow,” “Seamless integration,” and “Next-generation” with verifiable product statements.
- State the user task, actual capability, protocol, performance fact, constraint, or measurable result.
- Make button labels describe the action and outcome. Make errors explain what happened, whether data is safe, and how to recover.
- Replace emoji bullet decoration with meaningful iconography or concise text. Do not erase product-specific voice merely to sound generic or corporate.

## Step 5 · Interactive Ergonomics & Verification

Finish every control and state, then repeat the diagnostic loop:

```bash
npx -y unslop-mcp audit . --fail-under 95
npx -y unslop-mcp refactor-plan . --preset linear-precision --report UNSLOP-REPORT.md
```

Required interaction review:

- Use native `<button>`, `<a>`, `<input>`, and `<select>` semantics instead of clickable `<div>` elements.
- Associate every form control with a persistent label or explicit accessible name.
- Provide high-contrast `:focus-visible` rings with adequate offset in both themes.
- Design hover, active, disabled, loading, empty, error, and success states without relying on color alone.
- Replace `transition-all` with explicit `transition-colors`, `transition-transform`, or `transition-opacity`, plus `motion-reduce:transition-none` or equivalent behavior.
- Preserve logical DOM order; avoid positive `tabindex`. Provide practical pointer targets and keyboard alternatives.
- Test long text, large numbers, localization expansion, 200% zoom, narrow and wide viewports, reduced motion, and keyboard-only completion.

## Definition of done · 95–100/100 (A+)

The task is complete only when:

1. `unslop_audit` reports **95–100/100 (Grade A+)** with no suppressed findings.
2. All seven pillars have been reviewed, not merely the overall average.
3. `UNSLOP-REPORT.md` translations and P0/P1 steps have been applied or explicitly resolved.
4. Components consume one semantic token system with verified light/dark parity.
5. Keyboard, screen-reader semantics, all relevant states, reduced motion, responsive behavior, and content overflow have been exercised.
6. The rendered interface has been inspected. Never claim visual excellence from static analysis alone.

## Command and MCP reference

```bash
npx -y unslop-mcp --version
npx -y unslop-mcp audit .
npx -y unslop-mcp refactor-plan . --report UNSLOP-REPORT.md
npx -y unslop-mcp init --preset swiss-editorial
npx -y unslop-mcp extract ./tokens.css --name extracted -o .claude/skills/unslop/SKILL.md
npx -y unslop-mcp export-tokens --preset swiss-editorial --format w3c-json --out tokens.json
npx -y unslop-mcp --mcp
```

MCP tools:

1. `unslop_audit` — 72-rule diagnostic and seven-pillar scorecard.
2. `unslop_extract_dna` — reference extraction and compiled Design DNA.
3. `unslop_apply_preset` — archetype installation and merge-safe MCP configuration.
4. `unslop_refactor_plan` — exact Design Transformation Blueprint and prioritized refactor plan.

GitHub execution remains available as an alternative to the npm package:

```bash
npx -y github:avivgerz-hue/unslop audit .
npx -y github:avivgerz-hue/unslop --mcp
```
