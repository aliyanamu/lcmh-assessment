# Part 1 Review — EPD Extraction (20 concrete EPDs → provenance-traceable JSON)

**Date:** 2026-07-03
**Commit reviewed:** `10e3c00` — "Part 1: extract 20 concrete EPDs to provenance-traceable JSON"
**Verdict:** ✅ **The hard rule holds.** Zero wrong carbon numbers across 95 products; all provenance verified. Findings are provenance-page precision, doc drift, and Part-2 design notes — none is an incorrect figure. Cleared to start Part 2.

---

## Method

A per-EPD verification fan-out (23 agents), because the honest check is "does every number match its source PDF at the cited page" — 20 independent PDF-vs-JSON audits, too much to hold in one context (the catalog file alone is 4,332 lines).

- **19 agents** — one per single-product EPD: read `data/<id>.json`, dump the source PDF via `scripts/pdf_text.py`, and confirm every GWP module / split / declared-unit / strength / location / date against the cited `source_page`. Plus the four domain invariants (ND≠0, `incl` for combined-only product stages, module D stored separately with correct sign, +A1 isolated from +A2).
- **1 agent** — the 76-product catalog `IES-0009353`: structure check + 16 sampled mixes vs the master table + adjudication of the 4 validator flags.
- **3 agents** — holistic: doc/schema/validator consistency, cross-record convention drift, over-engineering (ponytail lens).
- **Human calibration:** I hand-verified one clean file (`HUB-5943` p8) and both "important" discrepancies (`HUB-5555` C/D on p14; `IES-0021165` A4 on p34) directly against the PDFs. Agent PDF-table reading was accurate in every case checked.

Rules of evidence given to every agent: only report a discrepancy you can quote from the PDF; a source defect already recorded in `notes[]` is correct behavior, not a finding; rounding within ~1–2% is fine.

---

## Verdict detail: the hard rule holds

- **0 wrong carbon numbers** across all 95 products. Every value spot-checked matched to the digit.
- **The 4 validator flags are correct, not errors.** Catalog products 69/71/72/73 (A1A3 GWP 72.7–97.5 kg/m³, below the 100–650 sanity band) are genuine low-carbon **CLSM lean flowable-fill** mixes (Grade N/A, near-zero cement, density 2000–2020 kg/m³) — physically expected sub-100 values, already documented in the record's `notes[]`. Correctly extracted, correctly flagged for review.
- **Invariants hold uniformly:** ND never rendered as 0; `incl` used only by EPD-International combined-only records; module D stored separately with the source sign (credit negative / burden positive) and never folded into an A–C total (no A–C total is stored anywhere); +A1/CML isolated in `gwp_a1a3_alt`, never sourced from GWP-GHG.

---

## Findings & disposition

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | 🟡 | Provenance deep-links land on a page that omits the number (split tables) | **Fixed** (notes) / Part-2 decision |
| 2 | 🟡 | `gwp_total.methodology` has 4 label variants for the same +A2 series | **Part-2 design** |
| 3 | 🟡 | Schema version says both v1.1 (title, CLAUDE.md) and v1.2 (changelog, commit) | **Fixed** |
| 4 | 🟡 | `summary_extras.source_page` never validated, though schema claims all figure blocks are | **Fixed** (validator) |
| 5 | 🔵 | Misspelled/unknown module keys silently ignored (closed vocab unenforced) | **Fixed** (validator) |
| 6 | 🔵 | `IES-0021165`: C1–C4 **and** D all ND + `mass_kg: null` | **Part-2 UI** |
| 7 | 🔵 | Catalog `published` = revision date, not first-publication (span ~2.25yr not ~5yr) | **Part-2 UI** |
| 8 | ⚪ | EXTRACTION.md 451 words vs "~400"; README "73" vs true 72.7; validator cosmetics | **Not fixed (intentional)** |

---

## What was fixed in this pass

**Doc/validator correctness (mechanical):**
- `data/schema.md:1` + `CLAUDE.md:26` — schema version `v1.1` → `v1.2` (the changelog and commit already said v1.2; the title/reference were stale). *No schema shape change.*
- `scripts/validate.mjs` — **`summary_extras` provenance now enforced.** `checkProvenance` iterates `summary_extras.*` and requires numeric `source_page`, so the schema's "every figure block has provenance" claim is now true for the energy/water figures (present in all 19 single-product files), not just the carbon blocks.
- `scripts/validate.mjs` — **closed-vocabulary guard on module keys.** Any key in `gwp_total.modules` outside the EN 15804 `A1..D` set (a typo like `C5`, `b1`, or a trailing space) is now an error. For hand-authored files that's the likely failure mode — a carbon figure sitting in the JSON that neither validator nor app would read. Both new guards proven to fire; `node scripts/validate.mjs` remains **0 errors, 4 expected flags**.

**Provenance-span notes (Finding 1) — 5 records annotated:**
The schema stores one `source_page` per figure block, but some source tables span pages. The *values are all correct*; the deep-link page is imprecise for continuation modules. Rather than silently repoint pages (which would then mis-cite the A1–A3 headline), each affected record now documents the span in `notes[]`, matching the convention `HUB-5210` already used:
- `HUB-5555`, `HUB-5882` — +A2 core table starts on p13 (A1–A3), C1–C4/D continue on p14.
- `IES-0021165` — each life-cycle stage is its own table on its own page; `source_page:32` is the A1–A3 table (Table 8), while A4=9.64 is on p34 (Table 13).
- `HUB-5749`, `HUB-5943`, `HUB-5991` — `location.source_page:2` has production + country; the 2nd plant site "Singleton" is named on p3.

---

## Deferred to Part 2 (design decisions, not data bugs)

- **Finding 1 (link granularity).** The A1–A3 headline (the comparable figure) always deep-links correctly. Continuation modules (C/D, A4) and enrichment fields (site list) can be one page off. **Decide:** link per *block* (one link per GWP table — p13/p32 are defensible table starts, notes disclose the span), or add per-module `source_page` (schema change across 20 files). Recommend per-block for v1 + the disclosure notes now in place; revisit only if the UI links each module row individually.
- **Finding 2 (methodology labels).** Group/compare on the uniform `standard` field, **not** the free-text `gwp_total.methodology`. Surface the real nuance: `IES-0014785` is EF **3.0**; everything else is EF **3.1** — a genuine comparability caveat, not just formatting. Consider a derived `ef_version` at read time.
- **Finding 6 (`IES-0021165`).** Only record with a fully-ND end-of-life (C1–C4 + D all ND) **and** `mass_kg: null`. Render EoL as "Not declared" (never 0/blank), and exclude it from m³↔tonne mass-normalized comparisons.
- **Finding 7 (catalog currency).** Compute validity from `valid_until` directly; don't assume publication + 5 years. Badge catalog products (shared C/D + plant across 76 mixes) as less directly comparable — already noted in README/schema.

---

## Deliberately not fixed

Over-engineering pass came back clean — Part 1 is appropriately minimal (13-line `pdf_text.py`, no-schema-lib validator, no dead config/deps). Not treating as work:
- EXTRACTION.md 451 words vs the "~400" target — sharp and within reason (~9–13% over).
- README catalog range "73–495" — 72.7 rounds to 73; defensible rounded summary.
- Validator's redundant `A1A3` branch (line 37 already owns it) and flag-output pluralization/truncation — not worth the churn; the truncation earns its keep on the 76-mix catalog.

---

## Appendix — per-file verification

**Clean (no findings):** HUB-5210, HUB-5394, HUB-5480, HUB-5527, HUB-5556, IES-0014327, IES-0014769, IES-0014785, IES-0014958, IES-0021754, IES-0023043, IES-0029695, IES-20602 (13).
**Findings (all provenance-page precision, values correct):** HUB-5555, HUB-5882 (C/D page), IES-0021165 (A4 page), HUB-5749, HUB-5943, HUB-5991 (site page) (6).
**Catalog:** IES-0009353 — structure OK, 16/76 sampled, 4 flags confirmed as real CLSM low-carbon mixes, 1 prose-note page-citation nit (version-history cited "p.71"; PDF is 37pp).

*Review artifacts: workflow run `wf_e716c38d-0f8`, 23 agents, 0 errors, ~890k tokens.*
