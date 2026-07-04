# EXTRACTION.md

20 concrete EPD PDFs → clean, traceable data (`data/*.json`; schema in `data/schema.md`).

## Overall strategy

**EPDs are standardised in meaning but chaotic in format, so I treated extraction as mapping, not reading.** Every one reports the same EN 15804 life-cycle stages; layouts differ wildly — two programs, many templates. Each is reduced the same way: find the carbon table, map its columns to the fixed stage set, note the unit, and — the hard rule — cite the exact page for every number. I locked the schema on **3 diverse EPDs first**; if it survived those, it survived the rest.

## Model & architecture

**The load-bearing decision is the architecture, not the model: a human-in-the-loop LLM read backed by mechanical provenance verification.** I chose that supervised, one-at-a-time read over an automated pipeline or a naive parser. **Claude Opus** drafts each PDF's JSON against a locked schema; then I check it and prove every figure against the PDF's own text (PyMuPDF). A pipeline is the same work with more to break; a parser can't tell +A1 from +A2 — identical to look at, not comparable. Claude, because the job is *reasoning* over ambiguous tables and their traps (is a column `A1A3` or an A–C total? a blank `ND` or zero?), not character-reading — and these being digital PDFs, OCR is the wrong tool. At scale you'd invert it: ingest machine-readable feeds, not scrape PDFs.

## Accuracy

**Two layers, in order — first *prove* every number is real, then check consistency.** The bridge pairs each figure, in a `bridge/` file, with the exact source text on its PDF page; a script confirms it's there and faithfully copied — proven before anything is trusted. Then the validator checks consistency: stages add up, missing data is *not declared* (never a silent 0), the end-of-life credit stays separate, the two standard editions never mix. All 20 pass; an image-only figure that can't be checked is flagged *unproven*.

## Research & process

**The thinking was one question I put to every EPD: does a missing or lumped-together number mean zero?** It almost never does — a blank module is *not declared*, not 0; a combined product-stage total doesn't zero its sub-parts, so those are *included*. I didn't take the AI's reads on faith either: every figure must trace to its source page or it doesn't ship. Then each surprise became a schema decision: 76 mixes in one EPD; a disposal figure that's a cost, not a saving; a strength tested at 56 days, not the standard 28 — so test age is its own field, a comparability limit. Each ran through a tight brainstorm → extract → review loop, landing in the schema, not a throwaway patch.
