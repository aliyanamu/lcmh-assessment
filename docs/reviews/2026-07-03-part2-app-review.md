# Review — Part 2: Concrete EPD Comparison App

**Date:** 2026-07-03
**Target:** the `web/` app (uncommitted working tree on `main`), reviewed against `TASK.md` Part 2.
**Method:** 3 independent agents (correctness+honesty audit, over-engineering/simplicity, TypeScript quality) + live runtime verification against the dev server and real data.

---

## Verdict

**Rating: 7.5 / 10 as reviewed → 9 / 10 after the fixes below + Vercel deploy.**

The scored dimension — an *honest* interface — is done to a high bar: the domain invariants are enforced by the type system (discriminated unions), the honesty logic is a pure, unit-tested core, and the worst-case ND-heavy product renders truthfully with zero dishonest zeros. Two things held the as-reviewed score back: a **hard-rule gap** (most figures in the compare table weren't individually traceable) and the **missing Vercel deploy** (a required deliverable).

| Dimension | Score | Note |
|---|---|---|
| Honest interface (the scored thing) | 9/10 | Type-enforced invariants; pure + tested honesty core; ND worst case honest |
| Requirement coverage | 7/10 | All 4 interaction requirements met; docked for hard-rule gap + no deploy |
| Code quality | 9/10 | "Genuinely good," "close to as lean as it gets"; `tsc` clean; no P1 logic bug |
| Correctness / edge cases | 7.5/10 | Solid; 1 P1 + 2 real P2s (below) |

## Coverage vs TASK.md Part 2

| Requirement | Status |
|---|---|
| Next.js + Node + TypeScript on Part 1 JSON | ✅ |
| Compare embodied carbon across full life cycle, stage by stage | ✅ |
| Filter + compare by compressive strength + manufacturing location | ✅ |
| Show where data is missing / not comparable (ND ≠ zero) | ✅ |
| Every carbon figure traceable to its source EPD (the hard rule) | ⚠️ → ✅ after fix P1 |
| Deploy to Vercel + live link | ❌ pending (needs account) |

**Honesty invariants — all independently verified upheld:** ND never 0/summed; `incl` shown as combined A1–A3; module D separate and never in an A–C total; +A1/CML never mixed with +A2; no false cradle-to-grave total (headline = A1–A3).

## Why we do what we do (rationale)

- **A1–A3 is the headline, not a life-cycle total** — A4/A5 are ND in ~85% of products, B in 97%; a single "total" would be dishonest. "Σ declared A–C" is explicitly caveated with its exclusions.
- **ND as text + CSS bars (not a stacked chart)** — a stacked bar renders a not-declared stage as zero height, which *is* the ND=0 lie. Text can't be mistaken for zero.
- **Honesty logic is a pure, tested core** — the invariants are the deliverable, so they're encoded in types + a runnable self-check, not left to discipline.
- **Catalog collapsed to one card** — the 76 Hallett mixes share one end-of-life figure + plant; showing them as 76 peers of the 19 distinct EPDs would misrepresent comparability.
- **Per-m³ direct, no unit toggle** — all 95 products are per-m³ (measured); a toggle would be dead code.
- **Provenance is one atom + PDFs in `public/`** — a single choke point makes the hard rule hard to violate by accident.
- **App isolated in `web/`, Turbopack root at repo root** — keeps Part 1's provenance paths + validator untouched; static JSON imports stay traceable for the dynamic `/compare` route.
- **URL-driven `/compare?ids=`** — a comparison becomes a shareable link; the decision and its provenance travel together.

## Findings & Resolution

**🔴 P1**
- **Most figures in the compare table lacked a provenance link** — only A1–A3 (+alt) linked; A4/A5/C/D/subtotal showed numbers with no clickable source. `CompareTable.tsx`. → **Fixed:** every declared module figure now carries a `p.N ↗` link (all share `gwp_total.source_page`); the derived subtotal is labelled "computed".

**🟡 P2**
- **Duplicate ids → duplicate columns + colliding React keys.** `compare/page.tsx`. → **Fixed:** dedupe with `[...new Set(idList)]`.
- **Module D labelled "credit" but can be a burden** (`IES-0014769` has D = +6.14). `lifecycle.ts` / `CompareTable.tsx`. → **Fixed:** sign-neutral label ("net load + / benefit −"), colour still driven by sign.
- **`validate.mjs` wasn't a build gate** — the JSON-boundary `as unknown as` casts erased compile checking with nothing re-checking it. → **Fixed:** `prebuild` now runs `validate.mjs`; `toProducts` asserts required blocks before the cast.

**🔵 P3**
- Compare button enabled at 1 selection (copy says "two or more") → **Fixed:** `disabled={selected.size < 2}`.
- `useMemo` with disabled `exhaustive-deps` (stale-closure footgun) → **Fixed:** dropped the memos (95 items, microseconds), removed the disables.
- Latent: subtotal didn't caveat *partially*-declared groups → **Fixed:** `partialStages` propagated to the subtotal caveat. `product_id`/`,` fragility → **Fixed:** build-time assertion that no `product_id` contains a comma.
- Dead code (`EPDS`, `SourceLink.label`, `moduleD`, duplicated `AC_STAGES`/`D_STAGE`, `round3` zero-guard, unreachable `incl` branch) → **Fixed:** removed.
- `noUncheckedIndexedAccess` hardening → **Enabled** + fallout fixed.

## Still outstanding (to be submission-complete)
1. Deploy to Vercel (needs account) + live link in README.
2. README run/deploy instructions.
3. Commit.
