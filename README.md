# Low Carbon Materials Hub — Assessment

A thin slice of a platform that makes concrete **EPDs** (Environmental Product Declarations) comparable for non-expert builders. Two parts, done in order:

- **Part 1 — data:** extract 20 concrete EPD PDFs into structured, provenance-traceable JSON.
- **Part 2 — app:** a Next.js + TypeScript app to compare products by embodied carbon across the life cycle.

## Status

- **Part 1 — complete.** 20 EPDs → `data/*.json` (95 products, incl. one 76-mix catalog). See the [review](docs/reviews/2026-07-03-part1-extraction-review.md): hard rule holds, 0 wrong numbers.
- **Part 2 — not started.**

## The one hard rule

Every carbon figure traces to its source EPD — `{ source.file, source_page }`. A number without provenance does not ship. The honesty invariants (not-declared ≠ zero, `incl` ≠ ND ≠ 0, module D kept separate, +A1 not comparable with +A2) are spelled out in [`CLAUDE.md`](CLAUDE.md) and encoded in the schema + validator.

## What's here

| Path | What |
|---|---|
| `data/*.json` | One record per EPD — the extracted data (source of truth for Part 2). |
| `data/schema.md` | The JSON schema (v1.2) and its rules. |
| `data/README.md` | Corpus overview + `epd_id` → source-PDF filename map. |
| `source-pdfs/` | The 20 source PDFs, committed — the provenance backbone. |
| `EXTRACTION.md` | How and why the extraction was done (the reasoning). |
| `scripts/validate.mjs` | Provenance + consistency validator. |
| `scripts/pdf_text.py` | Dumps per-page PDF text with 1-based page index (extraction tool). |
| `docs/` | Brainstorms, plans, and reviews. |

## Validate the data

```sh
node scripts/validate.mjs
```

Needs **Node 18+** (pure builtins — no `npm install`). Exit 0 with **0 errors** = every record is structurally sound and every figure carries provenance. **Flags** are human-review items (e.g. an unusually low-carbon mix), not failures — each is explained in the record's `notes[]`.

Re-dumping PDF text (optional, extraction-time only) needs PyMuPDF: `pip install pymupdf`, then `python3 scripts/pdf_text.py source-pdfs/<file>.pdf [page]`.

## Part 2

The app (Next.js, deploy to Vercel) will read `data/*.json` directly — no database. Run/deploy instructions land here when it's built.
