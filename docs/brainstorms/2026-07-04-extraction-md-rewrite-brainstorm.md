# Brainstorm — EXTRACTION.md rewrite (answer the 4 hirer questions cleanly)

**Date:** 2026-07-04
**Scope:** Restructure `EXTRACTION.md` so each of the four assessed questions gets a distinct, sharp answer. Content already exists in the repo — this is a **mapping/framing** fix, not new work. ~400-word budget.

---

## The problem

The four questions aren't four topics — they're four **lenses on one method**. The current doc has good material filed under the wrong headings, so "Overall strategy" and "Model & architecture" blur together and "Research & process" reads as conclusions, not thinking. Fix: give each question one distinct job.

| Question | Its job | One-line answer |
|---|---|---|
| Overall strategy | the *stance* | "Mapping onto a fixed stage-set, not free reading" + provenance-first + lock-schema-on-3-then-batch-17 |
| Model & architecture | the *build* + why-not-alternatives | Human-in-loop LLM reading + mechanical provenance verification; Opus as engine; OCR rejected in one line |
| Accuracy | how you *know* it's right | Consistency validator + the `bridge/` (every number *proven*, not asserted) — keep as-is |
| Research & process | the *thinking/journey* | Schema v1→v1.3 as a discovery log; compound-engineering loop as the mechanism |

---

## Section-by-section content plan

### 1. Overall strategy (~80w) — the stance
- EPDs are standardised in **meaning** (all report EN 15804 life-cycle stages) but chaotic in **format** (2 programs, many templates) → treat extraction as **mapping onto a fixed stage-set, not reading**.
- **Provenance-first:** every number carries `{file, page}` — the hard rule is a schema field, not a promise.
- **Sequencing:** lock schema on **3 diverse EPDs** (1 EPD Hub + 2 EPD International — different template/tool/coverage), then batch the other 17. "If v1 survives those 3, it survives the 17."
- *(Move the "locked schema on 3 varied EPDs" line here — it's strategy, not architecture.)*

### 2. Model & architecture (~130w) — the build + why over alternatives
**Architecture = human-in-the-loop LLM reading + mechanical provenance verification.** Three layers:
1. **Claude (Opus) reads each PDF page** → maps the GWP table onto EN 15804 modules → authors JSON against the fixed schema. These are **digital PDFs with a real text layer** (not scans), so every figure is extractable text — which is exactly what makes layer 3 possible.
2. **PyMuPDF (`pdf_text.py`)** dumps the exact page text.
3. **`bridge/` + `verify_bridge.py`** proves every number appears verbatim on its cited page (`raw ⊂ page_text` + `parse(raw) ≈ value`).

**Why over alternatives** (weigh the three): hand-authored vs scripted pipeline vs naive parser. For N=20 one-time files a pipeline is the same work with more failure surface (keys, retries) and eats the ~4h budget Part 2 needs; a regex/OCR parser can't tell +A1 columns from +A2 (identical to a parser, not comparable) → silent corruption.

**Why Opus specifically** (the "justify the model too" add): the task is *reasoning over ambiguous, varied-layout tables and their semantic traps* (is this column `A1A3` or an A–C total? +A1 or +A2? is a blank ND or zero?) — not character-reading. **OCR — the popular default — is the wrong tool here twice over:** these are digital PDFs (text layer, nothing to OCR), and even with perfect glyph-reading it can't see the semantic traps that are the whole point. OCR is a pre-step for the scanned long tail, not the architecture. What makes the data *trustworthy* is the verification layer, not the model — any capable LLM could read the tables; the bridge is the load-bearing choice. No model benchmark: TASK.md wants judgment, not a tool survey.

**Scale-up boundary** (one line, YAGNI): at volume you invert this — ingest machine-readable feeds (ILCD+EPD XML / openEPD / EC3 API), reserve LLM-PDF reading for the PDF-only long tail. Named as a chosen boundary, not built.

### 3. Accuracy (~90w) — keep, it already lands
- Two layers: **consistency validator** + the **bridge** (every number *proven* to exist, not asserted).
- Validator: stages add up · ND never a silent 0 · D stays separate · +A1/+A2 never mix.
- Bridge: each figure paired with its verbatim source token; script confirms it's really there and faithfully copied. All 20 pass; image-only (scanned) numbers flagged **UNPROVEN**, not trusted.
- *(Optional one-line evidence: a 23-agent per-EPD review found 0 wrong numbers across 95 products.)*

### 4. Research & process (~100w) — domain reasoning first
**Lead with the domain thinking.** The hard part isn't reading numbers — it's being honest about what's missing, lumped, or not comparable. The **schema evolved as a discovery log** (v1→v1.3), each bump a real surprise:
- `"incl"` — some EPDs report A1/A2/A3 only as a combined total → writing sub-parts as "0" would be a lie (v1.1).
- The **76-mix catalog EPD** (`IES-0009353`) → top-level `products[]` variant (v1.2).
- The **bridge layer** (v1.3) — after realizing `source_page` says *which* page, not that the number is *there*.
- Oddities each forcing a schema decision: **negative module D** (a credit — never summed into A–C); one disposal figure a **cost, not a saving**; one tested at **56 days not 28**; AS 1379 `N50` vs EN 206 `C50/60`.

**Mechanism (compound-engineering as the *how*, not the hero):** a tight brainstorm → plan → build → review loop meant each surprise **fed back into the schema/validator** instead of a one-off patch — the process compounded.

---

## Key decisions

- **Distinct job per question** — no repeating the same content under four headings.
- **Strategy = stance; Model&arch = build.** Move the schema-sequencing line into Strategy; keep the three-options weighing in Model&arch.
- **Answer "model" via architecture, then justify Opus briefly.** Verification design is the load-bearing choice; the model is the engine. OCR rejected in one line as solving the wrong problem. No benchmark (TASK.md: "not a survey of tools").
- **Research&process leads with domain reasoning** (schema v1→v1.3 discovery log); compound-engineering loop framed as the mechanism, not the achievement.
- **Keep Accuracy essentially as-is.** It already answers its question.
- **Hold the ~400-word budget.** Current 451 is fine per the Part 1 review; don't inflate — Model&arch grows, so trim elsewhere.

## Open Questions

_None blocking._ Both framing forks resolved (below). One **non-blocking sanity-check before writing Model&arch:** describe the real reading path — Claude read the PDF *pages*, PyMuPDF supplied the *text* the bridge verifies against. The figures live in the text layer (that's *why* the bridge works); don't claim multimodal vision was *essential* when text extraction would also reach these digital tables. Both are true — state the one you actually relied on.

## Resolved Questions

- **Research & process framing** → **domain reasoning first**; compound-engineering loop is the mechanism, not the headline.
- **How literal the "model" answer is** → **architecture-first, then justify Opus** with a short note + one-line OCR rejection; no comparison table.
