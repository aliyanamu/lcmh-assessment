# EXTRACTION.md

How I turned 20 concrete EPD PDFs into structured, provenance-traceable JSON (`data/*.json`, schema in `data/schema.md`).

## Overall strategy

EPDs are semantically standardised (EN 15804 life-cycle modules A1–D, GWP in kg CO₂e per declared unit) but visually chaotic — this set spans two programs (EPD Hub, EPD International/Australasia) with different templates, plus per-manufacturer quirks. So I treated extraction as a mapping problem: find the GWP table, map its columns to EN 15804 modules, capture the declared unit and strength, and — non-negotiably — record the **source page of every figure**. The schema enforces the honesty rules so they can't be lost downstream: a module value is a number, the string `"ND"`, or `"incl"`; every figure carries `{source.file, source_page}`.

## Model & architecture

I read each PDF and hand-authored JSON against a locked schema — no extraction pipeline. For 20 static files, a reproducible LLM-API harness is the *same* extraction with more plumbing and failure surface; deterministic parsers (pdfplumber/regex) can't distinguish EN 15804 **+A1** columns from **+A2**, which look identical but are not comparable. Text came from PyMuPDF (poppler was unavailable), which yields exact page indices — essential for provenance. I locked the schema on 3 deliberately diverse EPDs first, then parallelised the remaining 17. *At real scale the architecture inverts:* ingest machine-readable digital EPDs (ILCD+EPD XML, openEPD, the EC3 API) and reserve PDF/LLM extraction for the legacy tail — but that's the wrong tool for 20 files.

## Accuracy

Two layers. A ~90-line validator (`validate.mjs`) checks every record: provenance present on each figure; module values ∈ `number|"ND"|"incl"`; `A1+A2+A3 ≈ A1-A3` and `total ≈ fossil+biogenic+luluc` within rounding tolerances I sourced from real EPD data (95th-percentile drift 0.26%); and a 100–650 kg/m³ sanity band. Then manual spot-checks against the source pages — all matched to the digit. Three rules are structural, not conventions: **ND is a string, never 0**; **module D is stored separately, never summed into an A–C total**; **+A1 is isolated from the canonical +A2**. Source defects go in `notes[]`, never silently fixed (GWP-GHG mistakenly equal to GWP-total; a product code absent from its own PDF; a garbled manufacturer field).

## Research & process

The biggest correction came from the data. EPD International docs report the product stage **combined-only** (A1-A3, no split) — recording the missing A1/A2/A3 as `"ND"` would have been a lie, the exact "a not-declared stage is not a zero" trap. That forced the `"incl"` state. Then the edge cases: one EPD is a 76-mix catalog; one declares a *positive* module D (an end-of-life burden, not a credit); one is tested at 56 days, not 28. The through-line: the hard part of EPDs isn't reading numbers — it's being honest about what's missing, aggregated, or not comparable.
