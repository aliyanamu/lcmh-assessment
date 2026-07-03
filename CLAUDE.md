# LCMH Assessment — Project Instructions

A thin slice of a platform that makes concrete **EPDs** (Environmental Product Declarations) comparable for non-expert builders. Two parts:

- **Part 1 (data):** extract 20 concrete EPD PDFs → `data/<epd_id>.json`, plus `EXTRACTION.md` (reasoning).
- **Part 2 (app):** Next.js + Node + TypeScript app to compare products by embodied carbon across the life cycle. Deploy to Vercel.

## The hard rule — provenance is non-negotiable

**Every carbon figure must be traceable to its source EPD (`source.file` + `source_page`).** A number with no provenance is worse than no number — someone makes a real procurement decision on it. This holds in the data *and* in the app UI.

## Domain invariants (encode these; never violate)

These are honesty requirements, not style preferences:

1. **Not-declared ≠ zero.** A module marked `"ND"` is missing data, not `0` emissions. Never render `ND` as `0` or blank; never sum it as `0`.
2. **`"incl"` ≠ `ND` ≠ `0`.** For EPD International docs the product stage is reported combined — A1/A2/A3 carry `"incl"` (declared, rolled into `A1A3`). Show A1–A3 as one honest block; don't imply the sub-modules are zero or missing.
3. **Module `D` is separate.** The end-of-life benefit/credit (can be negative) is **never** added into an A–C life-cycle total. No aggregated A–C total is stored; the app computes sums with `ND`/`incl` awareness.
4. **+A1 and +A2 are not comparable.** EN 15804 +A2 is canonical. An +A1/CML figure (`gwp_a1a3_alt`) exists only to drive a "not comparable" warning — never mix or compare it with +A2.
5. **Normalize before comparing.** Different declared units (per m³ vs tonne) need `declared_unit.mass_kg` (density) to compare. Different **strength classes** aren't directly comparable — surface the difference, don't hide it.

## Data conventions

- One JSON per EPD PDF: `data/<epd_id>.json` (`HUB-<n>` / `IES-<n>`, registration number verbatim — no invented padding). Map in `data/README.md`.
- Multi-product / catalog EPDs use a top-level `products[]` array (see `schema.md`). Part 2 must badge them — they share a representative end-of-life figure and plant location, so they're less directly comparable.
- Schema: `data/schema.md` (v1.1). Validate: `node scripts/validate.mjs`.
- Source PDFs live in `source-pdfs/` — **committed** (they are the provenance backbone).
- `source_page` = 1-based **PDF page index** (not printed page number). App deep-links `source-pdfs/<file>#page=N`.
- Never silently correct a source value — record ambiguities/typos in the record's `notes[]`.

## Part 2 stack (when we get there)

- Next.js (App Router) + TypeScript. Import `data/*.json` directly — **no database** (20 static files).
- Scoring is on an *honest interface*, not visual polish. Spend effort on: ND/incl/`D` handling, +A1-vs-+A2 and unit/strength comparability guards, and clickable provenance — not styling.

## Scope discipline

- Only **GWP** is extracted (embodied carbon). The other ~20 EN 15804 impact categories are intentionally out of scope.
- No extraction pipeline / DB / Drive connector — 20 files, extracted once, verified by hand + `validate.mjs`. The scalable ingestion path is documented (brainstorm), not built.

## Working agreement

- Stay on the current git branch. Commit only when asked.
- Planning/reasoning docs: `docs/brainstorms/`, `docs/plans/`.
