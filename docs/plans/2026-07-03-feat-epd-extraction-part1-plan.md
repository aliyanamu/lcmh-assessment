---
title: "Part 1 — EPD Extraction: schema, /data/*.json, CLAUDE.md, EXTRACTION.md"
type: feat
status: active
date: 2026-07-03
brainstorm: docs/brainstorms/2026-07-03-part1-extraction-brainstorm.md
---

# ✨ Part 1 — EPD Extraction

## Overview

Turn 20 concrete EPD PDFs (in `source-pdfs/`) into structured, provenance-traceable JSON — one file per EPD — plus the two docs the task scores: `EXTRACTION.md` (reasoning) and `CLAUDE.md` (repo invariants that keep Part 2 honest).

**Method:** Claude reads each local PDF and hand-authors JSON against a locked schema. No extraction pipeline — 20 static files, verified by hand + one small check script. (Scale-up path is *documented*, not built — see brainstorm.)

**The hard rule drives the data model:** every carbon figure carries `source_page` + `source.file`. A number without provenance doesn't ship.

**Corpus:** 10 EPD Hub + 10 EPD International/Australasia (IES) — two programs, two templates. The schema must survive both, which is why v1 gets validated on 3 diverse EPDs before we batch the rest.

## Enhancement Summary (deepened 2026-07-03)

Grounded against **2 real EPD International/IES PDFs read in full** (Holcim EcoPact `IES-0029695`, Greencrete `IES-0023043`) plus sourced numeric research. Three findings that change the schema/checks:

1. **Product stage is combined-only in EPD International docs.** Both IES EPDs report **A1–A3 as a single figure with no A1/A2/A3 split** — yet the boundary table marks A1/A2/A3 individually *declared*. Recording a missing A1 as `"ND"` would be a **lie** (it's declared, just not disaggregated) — exactly the "a not-declared stage is not a zero" trap. → the module vocabulary gains a third state **`"incl"`** (declared, rolled into A1A3). This is the "stage-by-stage, not one number" honesty the task tests: for ~half the corpus the app shows the product stage as one honest block, `ND` only where a stage is genuinely undeclared. **Flag for Part 2:** the comparison UI must render an aggregated A1–A3 without implying A1/A2/A3 are zero or missing.
2. **`test_age_days` is absent** from both IES docs → nullable, never assumed 28.
3. **Numeric checks are grounded, not guessed** — real bands + tolerances + citations now in Verification (one source cross-checked the A1+A2+A3 identity against **39,213 real concrete EPD rows**).

**Multi-product risk dropped:** both validated docs were single-product, so `products[]` is a contingency, not an expected case. Both carried real source defects (unit typos, **mixed `,`/`.` decimal separators**, `EPD-IES-23043` vs `0023043` id padding, duplicated legend rows, GWP-GHG mistakenly equal to GWP-total) — reaffirming *trust no single field*. (Phase 1's IES structure scouting is now effectively done; it just formalizes the 3 JSONs + locks schema v1.1.)

## Scope

**In:** schema v1, 3-diverse validation + revision, extract all 20 → `data/*.json`, a `validate.mjs` consistency checker, `EXTRACTION.md`, `CLAUDE.md`.
**Out:** Part 2 app code. Non-GWP impact categories (acidification, eutrophication, …). Any Drive-connector / ingestion pipeline.

## Deliverables & File Layout

```
source-pdfs/           # 20 PDFs — committed, the provenance source (already present)
data/
  schema.md            # locked schema: field-by-field + one real example (source of truth)
  HUB-5943.json        # one file per EPD, named <epd_id>.json
  IES-0029695.json
  … (20 total)
scripts/
  validate.mjs         # Node: required-field + consistency checks across all data/*.json
CLAUDE.md              # repo conventions + domain invariants (root)
EXTRACTION.md          # ~400-word reasoning doc (root)
```

- **Filename convention:** `<epd_id>.json` — `HUB-####.json` (EPD Hub) / `IES-#######.json` (EPD International). Slug fallback if an EPD has no program id.
- **`source_page` semantics:** 1-based **PDF page index** (what a viewer opens), not the printed page number — so Part 2 can deep-link `source-pdfs/<file>#page=N`. The two differ (HUB-5943 prints "1" on PDF page 2).

## Schema v1 (condensed — canonical copy lives in `data/schema.md`)

```jsonc
{
  "epd_id": "HUB-5943",
  "product_name": "N50/20 Xencrete",
  "manufacturer": "Entire Concrete",
  "program_operator": "EPD Hub",
  "published": "2026-04-09", "valid_until": "2031-04-08",
  "standard": "EN 15804+A2",
  "pcr": "EPD Hub Core PCR v1.2; cPCR EN 16757",
  "lca_tool": "One Click LCA …",
  "verification": { "type": "external", "verifier": "Vera Durão" },
  "scope": "Cradle to gate with options, A4-A5, C1-C4, D",
  "source": { "file": "EPD_HUB-5943_2026-06-27_en.pdf", "drive_id": "…" },

  "compressive_strength": { "raw_class": "N50", "value_mpa": 50, "test_age_days": 28,
                            "standard": "AS 1379-2007", "source_page": 2 },
  "location": { "production": "Hunter Valley, NSW, Australia",
                "sites": ["Cameron Park", "Singleton"], "country": "AU", "source_page": 1 },
  "declared_unit": { "unit": "1 m3", "mass_kg": 2272, "source_page": 2 },

  "gwp_total": {                       // canonical series = EN 15804 +A2 / EF 3.1
    "methodology": "EN 15804+A2 / EF 3.1", "unit": "kg CO2e", "per": "1 m3", "source_page": 8,
    "modules": {                       // each value = number OR "ND". Never 0-for-missing.
      "A1": 270, "A2": 36.1, "A3": 3.65, "A1A3": 310,
      "A4": 2.91, "A5": 17.5,
      "B1": "ND","B2": "ND","B3": "ND","B4": "ND","B5": "ND","B6": "ND","B7": "ND",
      "C1": 4.32, "C2": 12.2, "C3": 6.96, "C4": 4.26,
      "D": -11.7
    }
  },
  "gwp_a1a3_alt": { "EN15804+A1_CML": 309, "source_page": 10 },  // only powers "not comparable" flag
  "summary_extras": {
    "total_energy_use_kwh_a1a3": { "value": 580, "source_page": 2 },
    "net_freshwater_use_m3_a1a3": { "value": 0.567, "source_page": 2 }
  },
  "notes": []   // free-text flags: outliers, ambiguities, source typos — never silently "fixed"
}
```

**Invariants baked into the shape:** module = `number | "ND" | "incl"` (ND≠0 by type; `incl` = declared but only reported inside A1A3) · `D` stored, never summed into A–C · `+A2` canonical, `+A1` isolated · declared unit + density present for m³↔tonne normalization · `source_page` on every figure.

**Schema updates from the validation batch (v1 → v1.1):**
- **Module third state `"incl"`** — for A1/A2/A3 when the EPD gives only a combined A1A3. `A1A3` is always populated (given directly, or summed when a split exists). `"incl"` ≠ `"ND"` ≠ `0`.
- **`compressive_strength.test_age_days` nullable** — not stated in EPD International docs.
- **`program_operator` + optional `regional_operator`** — IES docs have two parties (EPD International AB + EPD Australasia).
- **`verification.type` enum** = `external | process-certification | internal`; `verifier` may be a person *or* a certifying body (Holcim EcoPact = company-wide process certification, no per-EPD verifier).
- **`gwp_a1a3_alt` optional** — populate only when a genuine alternate-methodology table exists (EPD Hub & Holcim have a +A1/CML table; Greencrete does not). Do **not** shoehorn GWP-GHG into it.
- **`epd_id` normalization** — zero-pad IES ids to `IES-#######` (source mixes `EPD-IES-23043` and `0023043`).
- **Strength notation zoo** — `raw_class` may be plain MPa (`25`), AS 1379 special-class (`S25/20/100`, `S32MPa`), `N##`, or a brand grade code (`QE252M100`). Store raw; derive `value_mpa` when parseable; else null + `notes`.

## Edge Cases & Flow Analysis (SpecFlow, done inline)

These are the real failure modes the validation batch must probe — each has a decided default:

- **Multi-product EPD** *(highest risk — Holcim/EcoPact families often declare several mixes in one PDF).* → Keep one file per PDF (task rule); if multiple products, top-level `products: [ … ]` array, each with its own strength + GWP + provenance. **Confirm on the 2 IES docs in the validation batch.**
- **Declared unit ≠ m³** (per tonne/kg). → Store as-is; use `mass_kg`/density to enable normalization. If density absent → `notes` flag "not normalizable", never guess.
- **+A1-only (older) EPD** — no +A2 table. → `gwp_total.methodology` becomes `+A1`; comparability flag flips; `gwp_a1a3_alt` may hold the +A2 if present instead.
- **Aggregated-only modules** (A1-A3 combined, no A1/A2/A3 split; or C1-C4 combined). → Present keys carry numbers; absent sub-modules omitted or `"ND"` per the doc's own boundary table.
- **Multiple "not declared" tokens** — `ND`, `MND`, `NR`, `MNR`, blank. → All normalize to `"ND"`; if the distinction matters, keep raw in `notes`.
- **Number parsing** — scientific notation (`5.67E-01`), **unicode minus** (`‐` vs `-`), thousands separators, `kg CO2e` vs `kg CO2-eq`. → Parse to real numbers; watch the unicode minus (present in HUB-5943).
- **Missing/odd strength** — MPa vs EN 206 `C##/##` vs Australian `N##`/`S##`. → `raw_class` always; `value_mpa` when derivable; else null + `notes`.
- **Headline vs table mismatch** — the summary box GWP and the detailed-table A1-A3 should agree. → Cross-check; disagreement → `notes` + trust the detailed table.
- **Source typos** (HUB-5943: "N20/20" vs "N50/20"). → No single field trusted blindly; strength cross-checked against product name + description.
- **Expired validity** — capture dates, don't filter; Part 2 surfaces staleness.

## Implementation — Todo List

### Phase 0 — Scaffold (schema + harness)
- [ ] Write `data/schema.md` — field-by-field spec + the HUB-5943 example + the invariants list.
- [ ] Draft `CLAUDE.md` skeleton — project overview, the honesty invariants as rules, schema pointer, `/data` convention, `source_page` semantics, Part 2 stack (Next.js + TS, JSON imported directly, no DB). *(Finalized in Phase 4.)*
- [ ] Spec `scripts/validate.mjs` (see Verification) — required fields present, `source_page` on every figure, module values ∈ `number | "ND"`, consistency + sanity checks; prints a per-file pass/flag table.

### Phase 1 — Schema validation batch (GATE — do not batch until this passes)
- [ ] Extract **HUB-5943** → `data/HUB-5943.json` (already parsed this session; formalize it).
- [ ] Extract **2 diverse EPD International/IES** — pick a Holcim EcoPact (multi-product probe) + Hallett or Greencrete (different template/tool). Read the PDFs page-by-page.
- [ ] Run `validate.mjs` on the 3.
- [ ] Diff reality vs schema v1: multi-product? +A1-only? aggregated modules? new fields (exposure class, GTIN, EPD registration no.)? unit differences?
- [ ] **Revise schema v1 → lock v2** in `data/schema.md`. Record what changed and why (feeds EXTRACTION.md "research/process").

### Phase 2 — Batch extract remaining 17
- [ ] Extract the other 9 EPD Hub + 8 IES → `data/<epd_id>.json`, conforming to locked schema.
- [ ] Every carbon figure gets `source_page`; every not-declared module gets `"ND"`.

### Phase 3 — Verify all 20
- [ ] Run `validate.mjs` across all 20; every file passes or carries a `notes` entry explaining the flag (outliers explained, never silently corrected).
- [ ] Manual spot-check per EPD: A1-A3 GWP-total + one C-module + D vs the source PDF page. (N=20 is small enough to eyeball every headline.)
- [ ] Cross-check summary-box GWP == detailed-table GWP where both exist.

### Phase 4 — Docs
- [ ] Write `EXTRACTION.md` (~400 words) — strategy / model+architecture / accuracy / research+process. Written last so it reflects what actually surprised us across 20.
- [ ] Finalize `CLAUDE.md` with the locked schema + any conventions discovered.

### Phase 5 — Wrap
- [ ] `.gitignore` (node_modules if any), confirm `source-pdfs/` committed.
- [ ] Commit **only when the user asks**, on the current branch.

## Verification & Accuracy (`scripts/validate.mjs`)

A ~50-line Node script (matches Part 2's stack — no Python dep). Loads `data/*.json` and asserts, per file:

- **Structural:** required top-level fields present; `source.file` resolves to a file in `source-pdfs/`; every figure object has a numeric `source_page`.
- **ND discipline:** every module value is a `number` or the exact string `"ND"` — anything else (0-as-missing, null, blank) fails.
- **Consistency (grounded tolerances — printed EPD values are independently rounded, so identities are approximate):**
  - `A1 + A2 + A3 ≈ A1A3` — flag only if `|sum − A1A3| > max(1.5% × |A1A3|, 0.05 kg)`. **Skip when A1/A2/A3 are `"incl"`** (combined-only — not a failure). *(Basis: 39,213 real concrete EPD rows — 95th-pctile drift 0.26%, max 0.69%.)*
  - under +A2: `GWP-total ≈ fossil + biogenic + luluc` per module — flag if `|diff| > max(1% × |total|, 0.05 kg)`. *(Real EPDs drift 0.05–0.43% from independent rounding.)*
  - summary-box A1A3 == detailed-table A1A3 when both captured.
- **Sanity band:** A1-A3 GWP-total per m³ **< 100 or > 650 kg CO₂e → flag for review** (never auto-reject). Floor ~100 reflects the credible low end of GGBS/fly-ash mixes (the two validated low-carbon docs sit at 134–146); genuine geopolymer/AACM can go lower and needs manual review. Ignore EC3's 900–1100 tail — known data-quality artifacts, not real concrete.
- **Module D:** never summed into any A–C total — enforced. *(EN 15804+A2 via EPD International GPI v5.0.1 §A.7.5: "module D shall never be aggregated with the results of the product life cycle.")*
- **Output:** a pass/flag table; non-zero exit if any hard check fails. This *is* the "how do you know it's correct" answer, and the one runnable check the change leaves behind.

## Acceptance Criteria

- [ ] 20 × `data/<epd_id>.json`, each conforming to the locked schema.
- [ ] **Every carbon figure carries `source_page`; every record carries `source.file`.** No exceptions.
- [ ] Not-declared modules are `"ND"`, never `0`/`null`; `D` never folded into an A–C total.
- [ ] `validate.mjs` passes on all 20, or each flag is explained in that file's `notes`.
- [ ] `EXTRACTION.md` ≤ ~400 words, covering the four required areas.
- [ ] `CLAUDE.md` encodes provenance, ND≠0, D-separate, +A1≠+A2, normalize-by-declared-unit as repo rules.
- [ ] Multi-product handling decided and applied consistently.

## Risks & Open Decisions

- **Combined-only A1–A3 (EPD International, ~half the corpus)** — handled by the `"incl"` module state; the validator skips the A1+A2+A3 check for these. Residual risk is *Part 2*: the comparison UI must show an aggregated product stage honestly (not as zero/missing A1–A3 sub-rows).
- **Multi-product EPDs** — *contingency, not expected*: both validated docs were single-product. If a multi-product PDF appears, use top-level `products[]`. Decide on first occurrence.
- **IES template divergence** — confirmed real (One Click LCA vs SimaPro; different verification models; ~30 non-GWP indicators we correctly skip). The 3-diverse gate caught it.
- **Source-data defects** — mixed decimal separators (`,` vs `.`), unicode minus, unit typos, id padding, duplicated/mislabelled rows. Parser normalizes; `notes` records anything ambiguous. Trust no single field.
- **Provenance page drift** — printed vs PDF page numbers differ; standardize on 1-based PDF index, documented in CLAUDE.md so Part 2 deep-links correctly.

## References

- Brainstorm: `docs/brainstorms/2026-07-03-part1-extraction-brainstorm.md` (decisions, one-time-vs-scalable, corpus inventory)
- Task: `TASK.md` (hard rule, deliverables, ~4h budget)
- Standards (from brainstorm research): EN 15804 +A1/+A2 modules; ILCD+EPD / openEPD / EC3 (scale-up path only)
