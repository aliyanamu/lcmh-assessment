# EPD Extraction Schema — v1.1

One JSON file per EPD PDF in `data/<epd_id>.json`. This is the source of truth for the shape; the validator (`scripts/validate.mjs`) enforces the machine-checkable parts.

**The hard rule:** every carbon figure is traceable to `{ source.file, source_page }`. A number without provenance does not ship.

## Fields

| Field | Type | Notes |
|---|---|---|
| `epd_id` | string | `HUB-<n>` / `IES-<n>`. Registration number **verbatim from the document**, cross-checked with the filename — **no invented padding** (`IES-20602` stays 5-digit; don't pad to `0020602`). Drop the `:001`/`-001` revision suffix (base number is unique in this corpus). Filename↔doc mismatches (e.g. `0023043` vs in-doc `23043`) recorded in `notes[]`. |
| `product_name` | string | |
| `manufacturer` | string | The product manufacturer / declaration owner. |
| `program_operator` | string | e.g. `EPD Hub`, `EPD International AB`. |
| `regional_operator` | string? | e.g. `EPD Australasia` (IES docs have two parties). Omit if none. |
| `published` / `valid_until` | date `YYYY-MM-DD` | |
| `standard` | string | `EN 15804+A2` or `EN 15804+A1`. |
| `pcr` | string | PCR + any cPCR. |
| `lca_tool` | string | e.g. `One Click LCA …`, `SimaPro …`. |
| `verification` | `{ type, verifier }` | `type` ∈ `external` \| `process-certification` \| `internal`. `verifier` is a person **or** a certifying body. |
| `scope` | string | The declared module scope, verbatim-ish. |
| `source` | `{ file, drive_id? }` | `file` = the **exact original PDF filename** in `source-pdfs/` (kept as-received — it carries registration/revision/product/date; the authoritative provenance link). Validator asserts it resolves. |
| `compressive_strength` | `{ raw_class, value_mpa, test_age_days, standard, source_page }` | `raw_class` verbatim (`N50`, `S32MPa`, `S25/20/100`, `QE252M100`, `25`…). `value_mpa` derived when parseable, else `null`. `test_age_days` nullable (absent in IES docs). |
| `location` | `{ production, sites[], country, source_page }` | `country` ISO-2. |
| `declared_unit` | `{ unit, mass_kg, source_page }` | `mass_kg` = declared-unit mass → enables m³↔tonne normalization. |
| `gwp_total` | `{ methodology, unit, per, source_page, modules }` | Canonical GWP series = **EN 15804 +A2**. See modules below. |
| `gwp_a1a3_split` | `{ fossil, biogenic, luluc, source_page }`? | +A2 A1–A3 breakdown. Optional; enables an internal consistency check. |
| `gwp_a1a3_alt` | `{ methodology, value, source_page }`? | Alternate-methodology A1–A3 total (e.g. +A1/CML) — **only** to power a "not comparable" warning. Omit if the doc has no such table. Never GWP-GHG. |
| `summary_extras` | `{ total_energy_use_kwh_a1a3?, net_freshwater_use_m3_a1a3? }` | Each `{ value, source_page }`. Both optional (not uniformly reported). |
| `notes` | string[] | Free-text flags: outliers, ambiguities, source typos. Never silently "fix" — record it here. |

## Module vocabulary (`gwp_total.modules`)

Keys: `A1 A2 A3 A1A3 A4 A5 B1..B7 C1..C4 D`. Each value is:

- **a number** — declared value (in `unit`, per `per`).
- **`"ND"`** — module **not declared** (out of scope). The app renders "Not declared", **never `0`**.
- **`"incl"`** — *A1/A2/A3 only* — declared but reported **only inside the combined `A1A3`** (common in EPD International docs). Not a gap, not zero. `A1A3` is always a number.

`A1A3` is **always** populated (given directly, or the sum when a real split exists). It is the comparable product-stage figure.

**Module `D`** is stored on its own and is **never** summed into an A–C total. No aggregated A–C total is stored anywhere; the app computes displayed sums with `ND`/`incl` awareness.

## Provenance

`source_page` = **1-based PDF page index** (what a viewer opens), *not* the printed page number — the two differ (cover pages). Part 2 deep-links `source-pdfs/<file>#page=N`. Every figure block carries `source_page`.

## Multi-product (catalog) EPDs

Most EPDs declare one product → the product fields (`compressive_strength`, `location`, `declared_unit`, `gwp_total`, `gwp_a1a3_split?`, `gwp_a1a3_alt?`, `summary_extras?`) sit at the **top level**.

A **catalog / industry-average EPD** (e.g. `IES-0009353` — 76 mix designs) instead carries a top-level **`products[]`** array. Shared identity (`epd_id`, `manufacturer`, `program_operator`, `standard`, `pcr`, `verification`, `scope`, `source`, `notes`) stays at the top level; each entry of `products[]` holds its own product fields. The validator checks every entry. **Part 2 should badge catalog-sourced products** — they may share a single representative end-of-life figure and plant location (see the record's `notes[]`), so they are less directly comparable than single-product EPDs.

## Validation rules (see `scripts/validate.mjs`)

- **Errors (hard):** required fields present · `source.file` exists · every figure block has numeric `source_page` · `A1A3` numeric · every module value is `number|"ND"` (A1/A2/A3 also allow `"incl"`).
- **Flags (review, don't reject):**
  - `A1+A2+A3 ≈ A1A3` within `max(1.5%, 0.05 kg)` — skipped when A1/A2/A3 are `"incl"`.
  - `fossil+biogenic+luluc ≈ A1A3` within `max(1%, 0.05 kg)` when `gwp_a1a3_split` present.
  - per-m³ `A1A3` outside `[100, 650]` kg CO₂e — low-carbon/geopolymer or a data error; manual review.

Run: `node scripts/validate.mjs`

## Version

**v1.2** — added the multi-product `products[]` variant after `IES-0009353` (76-mix catalog EPD) surfaced during batch extraction.

**v1.1** — locked after scouting 3 diverse EPDs (EPD Hub `HUB-5943`; EPD International `IES-0029695`, `IES-0023043`). Changes from v1: `"incl"` module state, nullable `test_age_days`, `regional_operator`, `verification.type` enum, optional `gwp_a1a3_alt`, `epd_id` = registry-verbatim (no invented padding). See `docs/plans/2026-07-03-feat-epd-extraction-part1-plan.md`.
