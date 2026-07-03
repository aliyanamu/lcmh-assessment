# Brainstorm — Part 1: EPD Extraction Deliverables

**Date:** 2026-07-03
**Scope:** Part 1 of the LCMH take-home — produce `CLAUDE.md`, `EXTRACTION.md`, and `/data/*.json` (one per EPD). No app code (that's Part 2).

---

## What We're Building

Three deliverables from 20 concrete EPD PDFs:

1. **`/data/<epd_id>.json`** — one structured JSON per EPD. The data source for Part 2.
2. **`EXTRACTION.md`** — the scored reasoning doc. ~400 words: strategy, model/architecture, accuracy, research/process.
3. **`CLAUDE.md`** — repo instructions that encode the domain invariants as project rules, so Part 2 code can't silently violate them.

**The hard rule governs everything:** every carbon figure traces to `{file, page}`. A number without provenance is worse than no number.

---

## Why This Approach

**Extraction = Claude reads each PDF → hand-authors JSON → verifies.** No script, no LLM-API harness, no regex parser.

- 20 static, one-time files. A reproducible pipeline is plumbing for a problem we don't have (YAGNI). The LLM-API version is the *same* extraction with more moving parts, API keys, and a failure surface — and it would eat the ~4h budget Part 2 also needs.
- A deterministic parser (pdfplumber/regex) is brittle across 20 varied layouts and can't tell EN 15804 **+A1** columns from **+A2** — which look identical to regex but are not comparable.
- Hand-verified extraction on N=20 lets `EXTRACTION.md` be about *reasoning* (what's scored), not tooling.

**Scale-up boundary is deliberate, not an oversight** — see the *Extraction Strategy* section. Naming where "one-time" ends and "scalable" begins is itself a signal of judgment for `EXTRACTION.md`.

---

## Data Retrieval & Source of Truth

**Source of truth = `source-pdfs/` in the repo (20 PDFs, committed).** Not the Drive connector. This doubles as the provenance backbone every `source_page` points into — a required deliverable, so the PDFs belong in the repo regardless.

**Why not the connector.** It never enumerated the folder — *before and after* an ownership transfer it returned at most **1 of 20** files. The connector's search only indexes files the account holds in My Drive or has opened, and that index is eventually-consistent (stale for hours after a share change). Direct-ID reads worked, but there's no API path to *discover* the other 19 IDs. A one-time download bypassed the index entirely and gave a stable, repeatable source. (This is a "grab 20 files once" problem; the *Extraction Strategy* section covers the different, ongoing "ingest a growing corpus" problem, which is solved by program APIs / machine-readable feeds — not by scripting this connector.)

**Extraction reads the local PDFs** via native page-level file reading — ideal for `source_page` provenance, zero connector dependency in the build.

**Corpus inventory (from the download) — 2 programs, genuine template diversity:**
- **EPD Hub (×10):** HUB-5210, 5394, 5480, 5527, 5555, 5556, 5749, 5882, 5943, 5991
- **EPD International / EPD Australasia — IES (×10):** IES-0009353 (Hallett), IES-0014327 (Holcim Geostone), IES-0029695 (Holcim EcoPact), IES-0014769, IES-0014785 (Heidelberg / Woolworths), IES-0014958 (Hymix), IES-0021165, IES-0021754 (ACM Rockbank), IES-0023043 (Greencrete), IES-20602 (Holcim VIC EcoPact)

**→ The 3-diverse validation batch picks across this variance:** 1 × EPD Hub (`HUB-5943`, already parsed) + 2 × EPD International (a Holcim EcoPact + the Hallett or Greencrete) — different program, template, LCA tool, and likely different module coverage. If schema v1 survives those three, it'll survive the other 17.

---

## Extraction Strategy: One-Time vs Scalable

**Decision for this project: one-time.** 20 static files → Claude reads → hand-authored JSON → verified → committed to `/data`. Everything below is the *future* path, named in `EXTRACTION.md` to mark the boundary as chosen, not built now (YAGNI).

**The key insight for scale: the scalable path mostly stops scraping PDFs.** Digital EPDs already exist as machine-readable data. At volume you ingest *those* and reserve LLM-PDF extraction for the long tail of PDF-only / legacy declarations. "Scale" is not "run the same PDF scraper on more files."

- **Prefer structured feeds over PDFs.** `ILCD+EPD` XML (InData / ECO Platform — mandatory for new ECO Platform EPDs since 2022; one file carries all EN 15804 indicators, verifier details, and biogenic-carbon splits), `openEPD` (JSON, API-first), and program APIs: **EC3 / Building Transparency**, **EPD International**. ISO 22057 maps EPD data into BIM. A PDF becomes the *fallback* source, not the primary one.
- **LLM extraction as the fallback tail.** For PDF-only EPDs: schema-constrained structured output validated against a Pydantic/Zod schema, with **auto-retry on a sharper prompt when validation fails**; an OCR pre-step (Document AI / Textract) for scanned docs; optional **multi-model consensus voting** — agreement raises confidence, disagreement flags for review.
- **Human-in-the-loop review queue.** Low-confidence or high-stakes extractions always route to human review before publish — the same principle as our N=20 spot-check, made continuous.
- **Storage & lifecycle.** Normalized DB (Postgres) with provenance columns — *not* a vector store; this is structured comparison, not semantic search. Dedup the same EPD arriving from multiple sources; version reissued EPDs; expire records past `valid_until`.
- **Cost at scale.** Batch prompting, prompt caching, and prefix sharing cut redundant LLM compute.
- **The honesty rules don't change — they move into the pipeline.** ND≠zero, +A1≠+A2, normalize-by-declared-unit/density, and provenance-per-figure become schema validators and DB constraints instead of a careful human.

*Sources:* [openEPD interchange format](https://docs.open-epd-forum.org/en/open-epd-format-1/) · [ILCD+EPD / digital EPDs](https://epd.guide/standards-and-schemas/digital-epds-from-pdfs-to-plug-and-play-data-in-xml-or-json) · [ECO Platform digital data](https://www.eco-platform.org/eco-epd-40.html) · [EC3 API](https://www.buildingtransparency.org/api-access-pricing/) · [production LLM extraction lessons](https://medium.com/alan/lessons-from-running-an-llm-document-processing-pipeline-in-production-33d87f99cdb1) · [LLM structured PDF extraction 2026](https://unstract.com/blog/comparing-approaches-for-using-llms-for-structured-data-extraction-from-pdfs/)

---

## Key Decisions

**Schema: module value is a number OR the string `"ND"`.**
The ND≠zero rule enforced by the type itself. Part 2 renders a non-number as "Not declared", never as `0` or blank. Applies per module A1→D.

**Provenance lives in the data, not a sidecar.** Every figure carries `source_page`; the record carries `source.file`. The hard rule becomes a schema field, not a promise.

**Canonical GWP series = EN 15804 +A2 / EF 3.1.** The +A1/CML total is kept in a separate field (`gwp_a1a3_alt`) *only* to power a "not comparable" warning. GWP-GHG ignored. Three methodologies can coexist in one document — the schema must never let them be summed or compared.

**Module D is stored but never folded into an A–C total.** It's a separate benefit/credit and can be negative (−11.7 in HUB-5943).

**Declared unit + density are first-class.** `{unit, mass_kg}` enables m³↔tonne normalization for cross-product comparison in Part 2.

**Strength is stored raw + parsed.** `{raw_class: "N50", value_mpa: 50, test_age_days, standard}` — because notation varies (Australian AS 1379 `N50`, not EN 206 `C50/60`). Never assume a format.

**Schema scope = GWP across the full life cycle + two headline extras** (total energy use kWh, net freshwater use m³ — both in the EPD summary box). The other ~18 EN 15804 indicators are skipped: the task is embodied carbon and Part 2 never displays them. Add a generic `indicators` map only if a later need appears.

**Verification is two-layer:**
1. *Automated consistency checks* — `A1+A2+A3 ≈ A1-A3`; under +A2, `total ≈ fossil+biogenic+luluc`; sanity band (concrete A1–A3 ≈ 200–400 kg CO₂e/m³) flags outliers.
2. *Manual spot-check* — N=20 is small enough to eyeball every headline number against the source PDF. Source docs contain typos (HUB-5943 has an "N20/20" vs "N50/20" slip), so no single field is trusted blindly.

**`CLAUDE.md` encodes domain invariants as repo rules**, not just conventions: the provenance rule, ND≠zero, D-is-separate, +A1≠+A2, normalize-by-declared-unit. Plus schema location, `/data` file convention (`<epd_id>.json`), and Part 2 stack (Next.js + TS, JSON imported directly, no DB).

---

## Proposed Schema v1 (from HUB-5943)

```jsonc
{
  "epd_id": "HUB-5943",
  "product_name": "N50/20 Xencrete",
  "manufacturer": "Entire Concrete",
  "program_operator": "EPD Hub",
  "published": "2026-04-09", "valid_until": "2031-04-08",
  "standard": "EN 15804+A2",
  "pcr": "EPD Hub Core PCR v1.2; cPCR EN 16757",
  "lca_tool": "One Click LCA Concrete EPD Generator v3.2.3",
  "verification": { "type": "external", "verifier": "Vera Durão" },
  "scope": "Cradle to gate with options, A4-A5, C1-C4, D",
  "source": { "file": "EPD_HUB-5943_2026-06-27_en.pdf", "drive_id": "1UvhO1NU9Edm…" },

  "compressive_strength": { "raw_class": "N50", "value_mpa": 50, "test_age_days": 28,
                            "standard": "AS 1379-2007", "source_page": 2 },
  "location": { "production": "Hunter Valley, NSW, Australia",
                "sites": ["Cameron Park", "Singleton"], "country": "AU", "source_page": 1 },
  "declared_unit": { "unit": "1 m3", "mass_kg": 2272, "source_page": 2 },

  "gwp_total": {
    "methodology": "EN 15804+A2 / EF 3.1", "unit": "kg CO2e", "per": "1 m3", "source_page": 8,
    "modules": {
      "A1": 270, "A2": 36.1, "A3": 3.65, "A1A3": 310,
      "A4": 2.91, "A5": 17.5,
      "B1": "ND","B2": "ND","B3": "ND","B4": "ND","B5": "ND","B6": "ND","B7": "ND",
      "C1": 4.32, "C2": 12.2, "C3": 6.96, "C4": 4.26,
      "D": -11.7
    }
  },
  "gwp_a1a3_alt": { "EN15804+A1_CML": 309, "source_page": 10 },

  "summary_extras": {
    "total_energy_use_kwh_a1a3": { "value": 580, "source_page": 2 },
    "net_freshwater_use_m3_a1a3": { "value": 0.567, "source_page": 2 }
  }
}
```

---

## EXTRACTION.md — planned shape (~400 words)

- **Overall strategy** — semi-structured docs; locate GWP table, map columns → EN 15804 modules, capture unit/strength/provenance.
- **Model & architecture** — why LLM-read over pipeline/regex for N=20; scale-up path named.
- **Accuracy** — two-layer verification; ND handling; provenance-as-schema; source typos.
- **Research & process** — what surprised us: 3 GWP methodologies in one doc, AS 1379 vs EN 206, ND-heavy scopes, negative D.

---

## Definition of Done (Part 1)

- All 20 EPDs → one valid `/data/<epd_id>.json` each, conforming to the locked schema.
- **Every carbon figure carries `source_page`; every record carries `source.file`.** No exceptions — this is the hard rule.
- Not-declared modules stored as `"ND"`, never `0`/`null`. Module `D` never summed into an A–C total.
- Consistency checks pass, or any outlier is explained in a note field (not silently "fixed").
- `EXTRACTION.md` ≤ ~400 words, covering strategy / model+architecture / accuracy / research+process.
- `CLAUDE.md` encodes the domain invariants as repo rules (provenance, ND≠zero, D-separate, +A1≠+A2, normalize-by-declared-unit).

---

## Open Questions

_None blocking._ All 20 PDFs are in `source-pdfs/`. Next action is the 3-diverse schema-validation batch.

---

## Resolved Questions

- **Data retrieval** → 20 PDFs downloaded to `source-pdfs/` (committed = the provenance source). Drive connector abandoned for enumeration (stale index, never listed >1 of 20). See *Data Retrieval & Source of Truth*.
- **Extraction method** → Claude reads each local PDF → hand-authored JSON → verified. No pipeline.
- **Schema scope** → GWP full life cycle + total energy use + net freshwater use. Not the full 20 indicators.
- **Extraction strategy (one-time vs scalable)** → one-time now; scalable path documented as the deliberate boundary (see *Extraction Strategy* section).
- **Schema validation process** → lock v1 → extract ~3 *diverse* EPDs (different program operators/countries) as a validation batch → revise v1 if they break it → then batch the remaining 16.
- **`/data` filename convention** → `<epd_id>.json` (e.g. `HUB-5943.json`); slug fallback if an EPD has no program id.
