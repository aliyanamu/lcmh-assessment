# Brainstorm — Part 2: The Comparison App

**Date:** 2026-07-03
**Scope:** Part 2 of the LCMH take-home — a Next.js + TypeScript app that reads `data/*.json` (Part 1) and lets a non-expert builder compare concrete products by embodied carbon across the full life cycle. Deploy to Vercel.

---

## What We're Building

A two-view app, modelled on a familiar consumer **product-listing → compare** pattern (reference: Electrolux [list](https://www.electrolux.co.id/produk/mesin-cuci/) → [compare](https://www.electrolux.co.id/produk/compare/?productIds=EWW1024P5WB,EWF1023P5SC)):

1. **List view** — a filterable grid of product cards. Filters: **compressive strength** (class) and **manufacturing location** (AU state/region). Each card shows the headline **A1–A3** figure (with a provenance link), strength, location, manufacturer, and a "compare" checkbox.
2. **Compare view** — `/compare?productIds=A,B,…` (URL-driven, shareable). Products in columns, **life-cycle stages in rows** (A1–A3, A4, A5, B1–B7, C1–C4, D), each cell honest about ND / incl / negative D, each figure deep-linking to its source PDF page.

**The hard rule governs the UI too:** every number on screen is a link to `source-pdfs/<file>#page=N`. A figure with no provenance does not render.

---

## Why This Approach

**User chose the browse-then-compare shape over a leaner single-page tool** — it's the more familiar, more user-friendly mental model, and the shareable `?productIds=` URL turns a comparison into something you can hand to a colleague making a procurement call. That shareability is itself an honesty feature: the decision and its provenance travel together.

**All 95 products are per-m³ and all in Australia** (measured across `data/*.json`). Two consequences:
- The m³↔tonne normalization the schema built `declared_unit.mass_kg` for is **moot for this corpus** — comparison is directly valid per m³. We keep the density-aware logic unit-aware (so future non-m³ data is handled) but ship **no unit toggle** nobody's data needs (YAGNI).
- "Location" filtering is **within-AU** (state / region), not country.

**Comparison isn't styling — it's the honest interface.** Effort goes into ND/incl/`D` handling, the strength- and catalog-comparability guards, and clickable provenance. Not visual polish (explicitly not scored).

---

## How the Data Maps to the Views

**Flatten at load, address each product with a stable id.**
- 20 files → 95 products. 19 are single-product (id = `epd_id`). 76 belong to one catalog EPD (`IES-0009353`).
- Catalog entries need a URL-safe per-product id: **`<epd_id>--<mix_code>`** (mix codes like `S1020PLC1` are unique within the catalog). This is what `?productIds=` carries.

**Location filter derives a state from free text — with an explicit fallback, no silent mislabeling.** `location.production` is a string, not a structured state field. 92/95 carry a state token (`NSW|VIC|QLD|SA`); **3 don't** — `HUB-5210` "Melbourne South-East" (→VIC), `HUB-5527` "Airlie Beach" (→QLD), `IES-0021165` "South Australia" (spelled out, →SA). At load, derive the state via token match with a **small explicit map** for those three. Don't guess silently — an unmappable location filters as "location unknown", never a wrong state.

**Catalog handling (user picked "collapse behind manufacturer") fits the grid cleanly:**
- Top-level grid = **~20 cards**: 19 single-product EPDs + **1 "Hallett Ready Mix — 76 mixes (catalog)" card**. The 19 distinct EPDs stay visible instead of being buried.
- The catalog card **drills into** its 76 mixes (themselves filterable by strength). Each mix is **badged** "catalog / industry-average" and carries the shared-EoL + shared-plant caveat from the record's `notes[]` — they're less directly comparable, and the badge says so wherever the mix appears (list, compare, provenance).

---

## Key Decisions

**Two routes, no per-product detail page (yet).** List (`/`) + compare (`/compare`). The compare view with a single product selected *is* the detail view — a dedicated `/product/[id]` page is deferred until something needs it (YAGNI; keeps the build inside the shared budget).

**Provenance = PDFs served from `/public`, deep-linked `#page=N`.** 41 MB total, well within Vercel limits — no external hosting. Every figure block's `source_page` becomes a clickable link. This is the one non-negotiable.

**Stage-by-stage as an aligned table with inline bars, not a stacked bar.** A stacked/summed bar would visually swallow ND stages as if they were zero. An attribute-aligned table (stage per row, product per column) with a small magnitude bar per cell keeps every stage explicit — which is the whole point.

**The honesty rules, encoded in the view layer:**
- **ND → "Not declared"**, distinct styling, never `0`/blank, **excluded from every sum**.
- **incl → A1/A2/A3 shown as one "A1–A3 (combined)" block**; sub-modules marked "included", never zero or missing.
- **Module D is a separate row** below a divider — "End-of-life credit — not part of the A–C total", can be negative.
- **No single cradle-to-grave total presented as complete.** Because B1–B7 are ND almost everywhere, a full A–C total is rarely fully declared. Primary comparable headline = **A1–A3** (always declared). Any A–C subtotal shown carries an explicit "excludes N not-declared stages" caveat and is computed ND-aware.
- **`gwp_a1a3_alt` (+A1/CML) is never mixed into a comparison** — if surfaced at all, it's badged "+A1/CML — not comparable with +A2."

**Comparability guards in the compare view (surface the difference, don't hide it):**
- Different **strength class** → warn ("25 vs 50 MPa — higher strength generally means more binder/carbon; not like-for-like").
- **Catalog** items → the industry-average / shared-EoL badge.
- Guards stay **unit- and country-aware** in code even though this corpus is uniformly m³ / AU — cheap to keep, honest for future data.

**Stack: Next.js App Router + TypeScript, `data/*.json` imported directly. No DB, no state library** — filters and selection live in the URL (`?strength=&location=&productIds=`). Shareable and back-button-friendly for free.

---

## Definition of Done (Part 2)

- List view: grid of ~20 cards (catalog collapsed to one), filterable by strength class and AU location; each card headline figure links to its source page.
- Compare view: `/compare?productIds=…`, 2+ products side by side, life-cycle **stage by stage** (not one headline), shareable URL.
- **Every on-screen figure links to `source-pdfs/<file>#page=N`.** No figure without provenance.
- ND rendered "Not declared" and never summed; incl shown as combined A1–A3; module D separate and never folded into an A–C total; no "complete" life-cycle total implied when stages are ND.
- Strength-class and catalog comparability warnings visible in the compare view.
- Deployed to Vercel; live link in the README + submission.

---

## Open Questions

_None blocking._ The items below are **resolved by sensible default** — flag any you'd decide differently:

- **No per-product detail page** in v1 (compare-with-one doubles as detail). Add later if wanted.
- **Compare cap**: comfortable for 2–4 products; no hard limit enforced (wide tables just scroll).
- **Stage view = aligned table w/ inline bars** (chosen over stacked bar for ND honesty).
- **No unit toggle** (all data per m³); density kept internally, unit-aware guards retained.
- **Location filter** = derived AU state (token match + a 3-entry fallback map); unmappable → "location unknown", never a guessed state.

---

## Resolved Questions

- **App shape** → browse (list/grid) + URL-driven compare, Electrolux-style. User chose this over the leaner single-page tool for familiarity + shareable comparison links.
- **Catalog (76 mixes)** → collapse behind the manufacturer as one drill-in card; every mix badged catalog/industry-average with the shared-EoL caveat. Fits the card grid (top level stays ~20 cards).
- **Comparison basis** → per m³, directly (whole corpus is m³); no unit toggle.
- **Location filter** → within-AU state/region (whole corpus is AU).
- **Provenance mechanism** → PDFs in `/public`, deep-link `#page=N`, every figure clickable.
