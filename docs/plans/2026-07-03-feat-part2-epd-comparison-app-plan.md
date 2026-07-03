---
title: "Part 2 — Concrete EPD Comparison App"
type: feat
status: active
date: 2026-07-03
---

# feat: Part 2 — Concrete EPD Comparison App ✨

Next.js + TypeScript app that reads the Part 1 `data/*.json` and lets a non-expert
builder **compare concrete products by embodied carbon across the full life cycle**,
filter by **compressive strength** and **manufacturing location**, and see **where
data is missing or not comparable** — with **every figure clickable back to its
source PDF page**. Deployed to Vercel.

Basis: [`docs/brainstorms/2026-07-03-part2-app-brainstorm.md`](../brainstorms/2026-07-03-part2-app-brainstorm.md).
Decisions there (browse→compare, catalog collapse, per-m³, A1–A3 headline) are the input; this plan is the HOW.

---

## Data facts that drive the design (measured across all 20 files, 95 products)

These aren't trivia — each one changes what the UI must do honestly.

| Fact | Count | Design consequence |
|---|---|---|
| Products total | 95 (19 single + 76 catalog) | Catalog (`IES-0009353`) collapses to 1 drill-in card so the 19 distinct EPDs aren't buried. |
| Declared unit | `1 m3` × 95 | Compare per m³ **directly**. No unit toggle. |
| Country | `AU` × 95 | Location filter = AU **state**, derived (see below). |
| `A4`=ND / `A5`=ND | 82 / 83 | Transport & installation usually **not declared** — must render ND, never 0. |
| Any `B1–B7` numeric | 3 | Use stage almost always ND. A "complete life-cycle total" is a lie → **headline = A1–A3**. |
| All `C1–C4`=ND | 1 | Even end-of-life isn't universal. |
| Module `D` numeric / negative | 94 / 93 | D is a credit (negative), shown **separately**, never in an A–C sum. 1 product D=ND. |
| `value_mpa` null (CLSM) | 7 | Strength filter needs a **"non-structural / no class"** bucket, not a drop. |
| `gwp_a1a3_alt` (+A1/CML) | 14 | Show as a **badged, not-comparable** note; never mixed into +A2. |
| `gwp_a1a3_split` present | 95 | Every A1–A3 has fossil/biogenic/luluc — can show composition. |
| No state token in `location.production` | 3 | `HUB-5210` Melbourne→VIC, `HUB-5527` Airlie Beach→QLD, `IES-0021165` "South Australia"→SA. Explicit fallback map. |

---

## Architecture

**App in its own `web/` subfolder — separated from root.** Root stays for Part 1's artifacts (`data/`, `source-pdfs/`, `scripts/`, `docs/`) so their provenance paths and the validator are untouched. The Next app (`web/app`, `web/lib`, `web/public`, `web/package.json`) is self-contained.

```
lcmh-assessment/
├─ data/            # Part 1 — source of truth (95 products across 20 files)
├─ source-pdfs/     # Part 1 — provenance backbone (committed)
├─ scripts/         # Part 1 — validate.mjs, pdf_text.py
├─ docs/            # brainstorms / plans / reviews
└─ web/             # Part 2 — the Next.js app (this plan)
```

**Vercel:** Root Directory = `web`. Requires **"Include files outside the Root Directory in the Build Step" = ON** (Vercel default) so `web/` can reach `../data` (build-time JSON imports) and `../source-pdfs` (copied into `public/`). This one setting is the single deploy prerequisite — verify it.

**Stack:** Next.js App Router + TypeScript. **No DB, no state library, no chart library, no Tailwind.**
- Data: 20 static JSON imports from `../data` via a `@data/*` tsconfig path → flattened `Product[]` at build. `// ponytail: static imports over fs.readdirSync — bulletproof Vercel file-tracing, no runtime fs`.
- State: filters + selection live in the **URL** (`?strength=&location=&catalog=` on `/`, `?ids=A,B` on `/compare`). Shareable + back-button-friendly for free.
- Charts: **CSS bars** (a `<div>` with `width: %`). ND renders as *text*, not a zero-height bar — honest by construction. `// ponytail: CSS bars, add a chart lib only if a real chart appears`.
- Styling: one `web/app/globals.css`. `// ponytail: plain CSS; the interface is scored on honesty, not polish`.

**Provenance / PDFs:** a `prebuild`/`predev` step (`web/scripts/copy-pdfs.mjs`) copies `../source-pdfs → web/public/source-pdfs` (git-ignored copy — avoids duplicating 41 MB in git). Served at `/source-pdfs/<file>#page=N`. `// ponytail: copy into public at build; if the corpus outgrows Vercel static limits, stream via a route handler or move to blob storage`.

### Routes

- `/` — server component loads all products → renders `<ProductBrowser>` (client). Default sort: **A1–A3 ascending** (lowest embodied carbon first — the useful default for the builder).
- `/compare?ids=…` — server component reads `searchParams.ids`, looks up products, renders `<CompareTable>`. Unknown ids are dropped with a visible notice.

### Product identity (for `?ids=`)

- Single-product: `product_id = epd_id` (e.g. `HUB-5943`).
- Catalog: `product_id = ${epd_id}--${product_name}` (mix codes like `S1020PLC1` are unique within the catalog, alphanumeric). URL-encoded on write.

---

## File & component map (all under `web/`)

```
web/
├─ package.json                 # deps: next, react, react-dom; dev: typescript, @types/*. scripts: dev/build/start + pre* PDF copy
├─ tsconfig.json                # resolveJsonModule: true; paths @/* -> ./*, @data/* -> ../data/*
├─ next.config.mjs              # minimal
├─ scripts/copy-pdfs.mjs        # predev/prebuild: ../source-pdfs -> web/public/source-pdfs (git-ignored)
├─ app/
│  ├─ layout.tsx                # shell + globals.css + one-line "what this is / hard rule" header
│  ├─ globals.css               # minimal styling
│  ├─ page.tsx                  # server: load all -> <ProductBrowser products>
│  └─ compare/page.tsx          # server: read searchParams.ids -> resolve -> <CompareTable> (+ unknown-id notice)
├─ lib/
│  ├─ types.ts                  # ModuleValue = number | "ND" | "incl"; Epd, Product (flattened + derived), Modules
│  ├─ data.ts                   # 20 static JSON imports from @data/* -> flatten catalog -> Product[] w/ derived: product_id, state, mpa, isCatalog
│  ├─ location.ts               # deriveState(production): token match + 3-entry fallback; else "unknown"
│  └─ lifecycle.ts              # THE honesty core (see below): formatModule, declaredACSum, moduleD, stageRows, comparability
└─ components/
   ├─ ProductBrowser.tsx        # client: URL-synced filters (strength bucket, state), sort, selection, "Compare (n)" link
   ├─ CatalogGroup.tsx          # the collapsed "Hallett — 76 mixes (catalog)" card + drill-in sub-list (badged)
   ├─ ProductCard.tsx           # one product: name, mfr, MPa (or "non-structural"), state, A1–A3 headline + SourceLink, select checkbox
   ├─ CompareTable.tsx          # products in columns, life-cycle stages in rows; bars; ND/incl/D honesty; Warnings
   ├─ SourceLink.tsx            # <a href="/source-pdfs/{file}#page={n}">p.N ↗</a> — the provenance atom, reused everywhere
   └─ Warnings.tsx              # comparability banner (strength class, catalog, CLSM, +A1 alt)
```

`CatalogGroup` / `Warnings` may fold into their parents if trivial — split kept for clarity, merge if it's less code.

---

## The honesty core — `lib/lifecycle.ts`

This is what the app is scored on. Pure functions, unit-testable.

```ts
// lib/lifecycle.ts (sketch)

type ModuleValue = number | "ND" | "incl";

// A single cell's honest render intent.
formatModule(v: ModuleValue):
  | { kind: "value"; n: number }          // render number (+ signed, + bar by |n|)
  | { kind: "nd" }                         // render "Not declared" — NEVER 0/blank
  | { kind: "incl" }                       // render "included in A1–A3"

// Declared A–C sum, ND-aware. NEVER includes D. NEVER counts ND as 0.
declaredACSum(m: Modules): {
  sum: number;               // A1A3 + A4 + A5 + B1..B7 + C1..C4, numeric-only
  included: StageKey[];      // which stages contributed
  excludedND: StageKey[];    // ND stages, listed so the caveat can name them
}
// Uses A1A3 as the product stage — never also adds A1/A2/A3 (they're "incl"/components).

moduleD(m: Modules): { kind: "value"; n: number } | { kind: "nd" }   // separate, can be negative

// Row model for the compare table: one row per stage group.
stageRows(): [
  { key: "A1A3",  label: "A1–A3 Product (cradle-to-gate)" },   // always the headline
  { key: "A4",    label: "A4 Transport" },
  { key: "A5",    label: "A5 Installation" },
  { key: "B",     label: "B1–B7 Use", sub: [...] },
  { key: "C",     label: "C1–C4 End-of-life", sub: [...] },
  // divider
  { key: "D",     label: "D Beyond system boundary (credit)", separate: true },
]

// Comparability guards — surface differences, don't hide them.
comparability(products: Product[]): Warning[]
//  - strength: >1 distinct value_mpa  -> "different strength class — not like-for-like"
//  - non-structural: any value_mpa == null (CLSM) mixed with structural
//  - catalog: any isCatalog -> "industry-average; shares one end-of-life figure + plant location"
//  - altMethodology: any gwp_a1a3_alt present -> "an alternative +A1/CML figure exists; not comparable with +A2"
//  - (unit / country guards stay in code but no-op for this all-m³/all-AU corpus)
```

**Render rules enforced in `CompareTable`:**
- ND → "Not declared" (muted), never `0`/blank, never summed.
- incl → the A1/A2/A3 sub-cells say "included in A1–A3"; the A1–A3 row carries the number.
- Any **A–C subtotal is optional and caveated**: shown as "Σ declared A–C = X — excludes {A4, A5, B1–B7} (not declared)". No single "cradle-to-grave total".
- **D** sits below a divider, signed, labelled a credit, never added to the A–C subtotal.
- Negative values (D, some B1 carbonation) render **signed**; bar shows magnitude with a distinct "credit" color.
- Every numeric cell carries a `SourceLink` to `{gwp_total.source_page}`.

---

## Flow & edge cases (inline spec-flow analysis)

| # | Scenario | Handling |
|---|---|---|
| 1 | `/compare` with 0 ids | Empty state: "Pick products to compare" + link back to `/`. |
| 2 | `/compare` with 1 id | Renders the single column; still valid. Full single-product view now lives at `/product/[id]` (added on request — card name links there). |
| 3 | Unknown / malformed id in `?ids=` | Drop it, render a visible "N product(s) not found — omitted" notice. Never crash. |
| 4 | ND-heavy product (typical) | A4/A5/B all "Not declared"; headline A1–A3 present; subtotal caveats which stages are excluded. |
| 5 | CLSM mix (`value_mpa: null`) | Strength filter bucket "Non-structural (no class)"; card shows "non-structural"; comparability warns if compared with structural. |
| 6 | Product declares B modules (3 exist) | Render B numbers; handle **negative** B1 (carbonation uptake) with sign. |
| 7 | Product with `D` = ND (1 exists) | D row shows "Not declared", not 0. |
| 8 | Product with all C = ND (1 exists) | C rows show ND; subtotal names C as excluded. |
| 9 | `gwp_a1a3_alt` present (14) | Badged note "+A1/CML = X — not comparable with +A2"; never compared/summed. |
| 10 | Catalog mix in list / compare | Badge "catalog / industry-average" + shared-EoL caveat everywhere it appears. |
| 11 | Strength filter across 9 classes (10–80) + null | Buckets by class; "all" default; null → non-structural bucket. |
| 12 | Location filter | Derived state (token + 3-entry fallback); unmappable → "Location unknown", never a guessed state. |
| 13 | Filters yield no matches | "No products match these filters" empty state. |
| 14 | Comparing many products | Table scrolls horizontally; no hard cap. |
| 15 | Compare mixes strength classes / catalog + single | `Warnings` banner lists every applicable comparability caveat. |

---

## Build phases

**Phase 1 — Scaffold + data layer.** Manual minimal Next scaffold in `web/` (hand-write the config/app files, no eslint/boilerplate). `lib/types.ts`, `lib/data.ts` (20 imports from `@data/*` → flatten + derive), `lib/location.ts`. `prebuild`/`predev` PDF copy. Verify: all 95 products load, `product_id`s unique, states derived (incl. the 3 fallbacks), `npm run build` compiles. **[deps installed + files relocated to `web/`; data layer next.]**

**Phase 2 — Honesty core + compare view.** `lib/lifecycle.ts` + a tiny `lib/lifecycle.test` (assert ND not summed, D excluded from A–C, incl handling, negative D). `app/compare/page.tsx` + `CompareTable`, `SourceLink`, `Warnings`. Verify the edge-case table above against real records (`IES-0029695` incl, `HUB-5943` D/alt, a CLSM mix, a B-declaring mix). **[DONE — lib/lifecycle.ts + self-check (`npm test` green); compare view (`/compare?ids=…`, CompareTable, SourceLink, Warnings) built + verified live against HUB-5943/IES-0029695: strength guard, ND-as-text, D=−11.7 credit, +A1/CML badge, deep-links to p.8/p.16 all render. Browse view next.]**

**Phase 3 — Browse view + deploy.** `app/page.tsx` + `ProductBrowser` (client-state filters, sort by A1–A3), `ProductCard`, catalog collapse + drill-in. Empty/no-match states. Deploy to Vercel; add live link + run instructions to `README.md`. **[Browse view DONE + verified: 19 single cards + 1 collapsed Hallett 76-mix group, strength/location filters, select→/compare, per-card provenance. REMAINING: README run/deploy notes + Vercel deploy (needs account) + commit.]**

---

## Acceptance criteria

**Functional**
- [ ] `/` lists ~20 entries (catalog collapsed to one drill-in card), filterable by strength bucket + AU state, sorted by A1–A3 asc by default.
- [ ] `/compare?ids=…` shows 2+ products, **life cycle stage by stage** (A1–A3, A4, A5, B, C, D), shareable URL.
- [ ] Catalog drill-in lists its 76 mixes (badged), selectable into compare.

**Honesty (the hard part)**
- [ ] Every on-screen figure links to `/source-pdfs/<file>#page=N`. No figure renders without provenance.
- [ ] ND → "Not declared", never 0/blank, never summed.
- [ ] `incl` → A1/A2/A3 shown as combined A1–A3, sub-modules "included", never zero/missing.
- [ ] Module `D` separate, signed, never in an A–C subtotal.
- [ ] No single "complete life-cycle total" implied; any A–C subtotal names its excluded ND stages.
- [ ] Comparability warnings fire for: different strength class, non-structural (CLSM) vs structural, catalog/industry-average, +A1/CML alt present.

**Non-functional**
- [ ] Builds & deploys on Vercel (Node 18+). No DB. Minimal deps.
- [ ] `lib/lifecycle` has a runnable self-check for the sum/ND/D/incl rules.

---

## Risks

- **Root-dir separation on Vercel** — the app in `web/` reaches `../data` (build-time imports) and `../source-pdfs` (PDF copy) outside its root dir. Both depend on Vercel's **"Include files outside the Root Directory" = ON** (default). Mitigation: set Root Directory = `web`, confirm the setting, verify one deep link + the product count post-deploy. Fallback if ever disabled: copy `../data` into `web/` at prebuild too, or serve PDFs via a route handler.
- **Manual scaffold drift** — hand-written config could miss a Next default. Mitigation: keep it to the documented minimal set; `npm run build` is the check.
- **Deriving state from free text** — the 3-record fallback is explicit; anything unmatched shows "unknown" rather than a wrong state (honest by design).
- **Catalog dominance** — collapse keeps the list balanced, but comparability across the 76 shared-EoL mixes must stay badged so it's never read as 76 independent EPDs.

---

## References

- Brainstorm: `docs/brainstorms/2026-07-03-part2-app-brainstorm.md`
- Schema + invariants: `data/schema.md`, `CLAUDE.md` (ND≠0, incl≠ND≠0, D separate, +A1≠+A2, normalize-before-compare)
- Data: `data/*.json` (source of truth); corpus map `data/README.md`
- Provenance backbone: `source-pdfs/` (→ copied to `public/source-pdfs/` at build)
- Validator (data invariants already enforced): `scripts/validate.mjs`
- UX reference (user-chosen pattern): Electrolux list → `?productIds=` compare
