// Runnable self-check for the honesty core. No framework — Node 24 runs TS directly:
//   npm test   (from web/)   →   node lib/lifecycle.test.ts
import assert from "node:assert/strict";
import {
  cell,
  stageCell,
  declaredACTotal,
  comparability,
  strengthLabel,
  STAGES,
} from "./lifecycle.ts";
import type { Modules, Product } from "./types.ts";

function mods(over: Partial<Modules>): Modules {
  const nd = "ND" as const;
  return {
    A1: "incl", A2: "incl", A3: "incl", A1A3: 100,
    A4: nd, A5: nd,
    B1: nd, B2: nd, B3: nd, B4: nd, B5: nd, B6: nd, B7: nd,
    C1: nd, C2: nd, C3: nd, C4: nd,
    D: nd,
    ...over,
  };
}

const stage = (k: string) => STAGES.find((s) => s.key === k)!;

// Real HUB-5943 modules.
const hub = mods({
  A1: 270, A2: 36.1, A3: 3.65, A1A3: 310, A4: 2.91, A5: 17.5,
  C1: 4.32, C2: 12.2, C3: 6.96, C4: 4.26, D: -11.7,
});

// 1. ND / incl / number never collapse into each other.
assert.deepEqual(cell("ND"), { kind: "nd" });
assert.deepEqual(cell("incl"), { kind: "incl" });
assert.deepEqual(cell(3.65), { kind: "value", n: 3.65 });

// 2. All-ND group (B1–B7) renders "nd", not 0.
assert.deepEqual(stageCell(hub, stage("B")), { kind: "nd" });

// 3. Group stage subtotals its declared members (C1–C4 = 27.74).
const c = stageCell(hub, stage("C"));
assert.ok(c.kind === "value" && Math.abs(c.n - 27.74) < 1e-9, `C sum ${JSON.stringify(c)}`);

// 4. Declared A–C total excludes D, excludes ND stages, sums the rest.
const t = declaredACTotal(hub);
assert.ok(Math.abs(t.sum - 358.15) < 1e-9, `A–C sum ${t.sum}`);
assert.ok(!t.includedStages.includes("D"), "D must never be in the A–C total");
assert.ok(t.excludedNDStages.includes("B1–B7"), "undeclared B must be flagged excluded");
assert.ok(t.includedStages.includes("A1–A3") && t.includedStages.includes("C1–C4"));

// 5. Module D stays separate and keeps its (negative) sign; positive D is a load, not a credit.
assert.deepEqual(cell(hub.D), { kind: "value", n: -11.7 });
assert.deepEqual(cell(6.14), { kind: "value", n: 6.14 });

// 6. "incl" product: the A1–A3 row still shows the combined number (146), not "incl".
const incl = mods({ A1: "incl", A2: "incl", A3: "incl", A1A3: 146 });
assert.deepEqual(stageCell(incl, stage("A1A3")), { kind: "value", n: 146 });

// 7. Partially-declared group (C4 = ND) sums the rest and flags the gap.
const partial = mods({ C1: 1, C2: 2, C3: 3, C4: "ND" });
const pc = stageCell(partial, stage("C"));
assert.ok(pc.kind === "value" && pc.n === 6 && pc.partialND?.includes("C4"), `partial ${JSON.stringify(pc)}`);
// ...and the A–C subtotal caveats that partial stage (never silently understates).
assert.ok(
  declaredACTotal(partial).partialStages.some((s) => s.includes("C4")),
  "subtotal must flag partially-declared C",
);

// 8. Strength label: null (CLSM) is "Non-structural", never blank or 0.
assert.equal(strengthLabel(null), "Non-structural");
assert.equal(strengthLabel(25), "25 MPa");

// 9. Comparability warnings fire for the real mismatches.
const p = (o: Partial<Product>) => ({ declared_unit: { unit: "1 m3" }, ...o }) as unknown as Product;
assert.ok(comparability([p({ mpa: 25 }), p({ mpa: 50 })]).some((w) => w.text.includes("strength")));
assert.ok(comparability([p({ mpa: 25, isCatalog: true }), p({ mpa: 25 })]).some((w) => w.text.includes("catalog")));
assert.ok(comparability([p({ mpa: null }), p({ mpa: 25 })]).some((w) => w.text.includes("non-structural")));
assert.equal(comparability([p({ mpa: 25 })]).length, 0, "single product → no comparability warnings");

// 9b. Test age: a 56-day strength beside a 28-day one is flagged; a shared 28-day age is not;
//     an unstated age is never assumed to be 28 (no false "all 28" equivalence).
const withAge = (mpa: number | null, age: number | null) =>
  p({ mpa, compressive_strength: { raw_class: "", value_mpa: mpa, test_age_days: age, standard: "", source_page: 1 } });
assert.ok(
  comparability([withAge(32, 56), withAge(32, 28)]).some((w) => w.text.includes("test age")),
  "56-day vs 28-day strength must warn — same MPa, not equal strength",
);
assert.equal(
  comparability([withAge(25, 28), withAge(25, 28)]).filter((w) => w.text.includes("test age")).length,
  0,
  "both certified at the standard 28 days → no test-age warning",
);
assert.ok(
  comparability([withAge(32, 56), withAge(32, null)]).some((w) => w.text.includes("unstated")),
  "lone 56-day strength vs an unstated age must warn and name the unstated age",
);

console.log("lifecycle self-check: all assertions passed ✓");
