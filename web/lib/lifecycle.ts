// The honesty core. Pure functions over a product's GWP modules. This is where the
// domain invariants live (CLAUDE.md): ND is never 0, "incl" is shown as combined A1–A3,
// module D is never folded into an A–C total, and no "complete" life-cycle total is implied.
import type { Modules, Product } from "./types";

// One module value → how it should render. ND is never 0/blank; incl means "inside A1–A3".
export type Cell =
  | { kind: "value"; n: number }
  | { kind: "nd" }
  | { kind: "incl" };

export function cell(v: number | "ND" | "incl"): Cell {
  if (v === "ND") return { kind: "nd" };
  if (v === "incl") return { kind: "incl" };
  return { kind: "value", n: v };
}

export type StageKey = "A1A3" | "A4" | "A5" | "B" | "C" | "D";

export interface StageDef {
  key: StageKey;
  label: string;
  short: string;
  modules: (keyof Modules)[];
  separate?: boolean; // module D — shown apart, never summed into A–C
}

export const STAGES: StageDef[] = [
  { key: "A1A3", label: "Product (cradle-to-gate)", short: "A1–A3", modules: ["A1A3"] },
  { key: "A4", label: "Transport to site", short: "A4", modules: ["A4"] },
  { key: "A5", label: "Installation", short: "A5", modules: ["A5"] },
  { key: "B", label: "Use stage", short: "B1–B7", modules: ["B1", "B2", "B3", "B4", "B5", "B6", "B7"] },
  { key: "C", label: "End-of-life", short: "C1–C4", modules: ["C1", "C2", "C3", "C4"] },
  {
    key: "D",
    // Sign-neutral: module D is usually a recovery credit (negative) but can be a net
    // load (positive, e.g. IES-0014769 = +6.14). Never call it a "credit" unconditionally.
    label: "Beyond system boundary (net load + / benefit −)",
    short: "D",
    modules: ["D"],
    separate: true,
  },
];

export const AC_STAGES = STAGES.filter((s) => !s.separate);
export const D_STAGE = STAGES.find((s) => s.key === "D")!;

export type StageCellView =
  | { kind: "value"; n: number; partialND?: (keyof Modules)[] }
  | { kind: "nd" }
  | { kind: "incl" };

// One stage's honest display for one product. Single-module stages defer to cell().
// Group stages (B, C) subtotal their declared members and report which sub-modules are
// ND (partialND), or return "nd" if the whole stage is undeclared — never 0.
export function stageCell(m: Modules, s: StageDef): StageCellView {
  if (s.modules.length === 1) {
    return cell(m[s.modules[0]!]);
  }
  let sum = 0;
  let declared = 0;
  const nd: (keyof Modules)[] = [];
  for (const key of s.modules) {
    const v = m[key];
    if (v === "ND") nd.push(key);
    else if (typeof v === "number") {
      sum += v;
      declared++;
    }
  }
  if (declared === 0) return { kind: "nd" };
  return { kind: "value", n: sum, partialND: nd.length ? nd : undefined };
}

export interface DeclaredTotal {
  sum: number;
  includedStages: string[];
  excludedNDStages: string[];
  partialStages: string[]; // stages counted but with some sub-modules ND, e.g. "C1–C4 (excl. C4)"
}

// Sum of DECLARED A–C modules only. Never includes D. Never counts an ND stage as 0 —
// undeclared stages are listed in excludedNDStages so the UI can caveat the figure, and
// partially-declared groups (e.g. C4 ND) are listed in partialStages so the subtotal never
// silently understates. This is deliberately NOT a "cradle-to-grave total": with A4/A5/B
// usually ND, no such complete number honestly exists — the headline stays A1–A3.
export function declaredACTotal(m: Modules): DeclaredTotal {
  let sum = 0;
  const included: string[] = [];
  const excluded: string[] = [];
  const partial: string[] = [];
  for (const s of AC_STAGES) {
    const c = stageCell(m, s);
    if (c.kind === "value") {
      sum += c.n;
      included.push(s.short);
      if (c.partialND) partial.push(`${s.short} (excl. ${c.partialND.join(", ")})`);
    } else {
      excluded.push(s.short); // "nd" (incl can't occur for A1A3/A4/A5)
    }
  }
  return { sum, includedStages: included, excludedNDStages: excluded, partialStages: partial };
}

export function strengthLabel(mpa: number | null): string {
  return mpa == null ? "Non-structural" : `${mpa} MPa`;
}

// Display rounding to 3 significant figures (EPDs report ~3 sig figs). Not used in sums.
export function round3(n: number): number {
  return Number(n.toPrecision(3));
}

export interface Warning {
  level: "warn" | "info";
  text: string;
}

// Surface every reason the selected products may not be like-for-like. Never hides them.
export function comparability(products: Product[]): Warning[] {
  const w: Warning[] = [];
  if (products.length < 2) return w;

  const mpas = new Set(products.map((p) => p.mpa).filter((x): x is number => x != null));
  if (mpas.size > 1) {
    w.push({
      level: "warn",
      text: `Comparing different strength classes (${[...mpas]
        .sort((a, b) => a - b)
        .join(", ")} MPa). Higher strength usually needs more binder and carries more embodied carbon — not a like-for-like comparison.`,
    });
  }

  const hasCLSM = products.some((p) => p.mpa == null);
  const hasStructural = products.some((p) => p.mpa != null);
  if (hasCLSM && hasStructural) {
    w.push({
      level: "warn",
      text: "Includes a non-structural material (CLSM / flowable fill, no strength class) alongside structural concrete — they serve different purposes.",
    });
  }

  // Compressive strength is certified at a test age. A strength measured at a later age isn't
  // equal to the same MPa at the standard 28 days, and an unstated age is never assumed to be 28.
  const ages = products
    .filter((p) => p.mpa != null) // only structural products carry a meaningful strength/age
    .map((p) => p.compressive_strength?.test_age_days ?? null);
  const knownAges = [...new Set(ages.filter((a): a is number => a != null))].sort((a, b) => a - b);
  if (knownAges.some((a) => a !== 28) || knownAges.length > 1) {
    const shown = knownAges.map((a) => `${a} d`).join(", ");
    const someUnstated = ages.some((a) => a == null);
    w.push({
      level: "warn",
      text: `Compressive strengths are certified at different test ages (${shown}${
        someUnstated ? ", plus some unstated" : ""
      }). A strength measured at a later age (e.g. 56 days) isn't equal to the same MPa at the standard 28 days, and an unstated age is never assumed to be 28.`,
    });
  }

  const catalog = products.filter((p) => p.isCatalog).length;
  if (catalog > 0) {
    w.push({
      level: "info",
      text: `${catalog} of these come from a catalog / industry-average EPD — they share one representative end-of-life figure and plant location, so they are less directly comparable than single-product EPDs.`,
    });
  }

  if (products.some((p) => p.gwp_a1a3_alt)) {
    w.push({
      level: "info",
      text: "Some products also report an alternative +A1 / CML figure. It is not comparable with the EN 15804 +A2 values shown here and is never mixed in.",
    });
  }

  // Unit guard — no-op for this all-m³ corpus, kept for future non-m³ data.
  const units = new Set(products.map((p) => p.declared_unit.unit));
  if (units.size > 1) {
    w.push({
      level: "warn",
      text: `Different declared units (${[...units].join(", ")}) — normalize by mass before comparing.`,
    });
  }

  return w;
}
