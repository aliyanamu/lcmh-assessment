# Low Carbon Materials Hub — Assessment

A thin slice of a platform that makes concrete **EPDs** (Environmental Product Declarations) comparable for non-expert builders. Two parts, done in order:

- **Part 1 — data:** extract 20 concrete EPD PDFs into structured, provenance-traceable JSON.
- **Part 2 — app:** a Next.js + TypeScript app to compare products by embodied carbon across the life cycle.

## Status

- **Part 1 — complete.** 20 EPDs → `data/*.json` (95 products, incl. one 76-mix catalog). See the [review](docs/reviews/2026-07-03-part1-extraction-review.md): hard rule holds, 0 wrong numbers.
- **Part 2 — built.** Next.js + TypeScript app in [`web/`](web): browse, per-product detail, and stage-by-stage compare, with a clickable source link on every figure. See the [Part 2 review](docs/reviews/2026-07-03-part2-app-review.md). Vercel deploy pending.

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
| `web/` | Part 2 — the Next.js + TypeScript app (browse · detail · compare). |
| `docs/` | Brainstorms, plans, and reviews. |

## Validate the data

```sh
node scripts/validate.mjs
```

Needs **Node 18+** (pure builtins — no `npm install`). Exit 0 with **0 errors** = every record is structurally sound and every figure carries provenance. **Flags** are human-review items (e.g. an unusually low-carbon mix), not failures — each is explained in the record's `notes[]`.

Re-dumping PDF text (optional, extraction-time only) needs PyMuPDF: `pip install pymupdf`, then `python3 scripts/pdf_text.py source-pdfs/<file>.pdf [page]`.

## Part 2 — the app

A Next.js (App Router) + TypeScript app in [`web/`](web) that reads `../data/*.json` directly — **no database** (20 static files). It lets a non-expert builder:

- **Browse** all products, filtered by compressive strength and AU state. The 76-mix Hallett catalog collapses into one drill-in card so it doesn't bury the 19 distinct EPDs.
- **Compare** 2+ products side by side, **stage by stage** across the full life cycle (A1–A3 · A4 · A5 · B · C · D), via a shareable `/compare?ids=…` URL.
- **Inspect** one product in full at `/product/[id]` — declaration metadata, A1–A3 composition, and the extraction notes.

**Honesty is the point** (see [`CLAUDE.md`](CLAUDE.md)): not-declared renders as "Not declared", never `0`, and is never summed; module **D** is shown separately and never folded into an A–C total; `incl` sub-modules show as the combined A1–A3; +A1/CML figures are badged "not comparable" and never mixed with +A2; and **every figure deep-links to its source PDF page**.

### Run locally

```sh
cd web
npm install
npm run dev          # http://localhost:3000
```

`predev`/`prebuild` first run `scripts/validate.mjs` (the data must pass) and then copy `source-pdfs/` into `web/public/` so provenance links resolve. Needs **Node 20.9+** for the app; the `npm test` honesty self-check runs TypeScript directly, so use **Node 22.18+/24**.

### Deploy to Vercel

The app is in `web/` but reads `../data` and `../source-pdfs` at the repo root, so set:

- **Root Directory** = `web`
- **Include files outside the Root Directory in the Build Step** = **ON** (Vercel default) — makes `../data` (build-time imports) and `../source-pdfs` (copied into `public/`) available at build.

Framework preset = Next.js (auto-detected), no environment variables. The live link goes here once deployed.
