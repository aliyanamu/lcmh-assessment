// Derive an AU state from the free-text location.production string.
// 92/95 products carry a state token; 3 don't and get an explicit fallback.
// Never guess silently — an unmappable location is "unknown", not a wrong state.
// (See docs/plans/2026-07-03-feat-part2-epd-comparison-app-plan.md.)

const STATE = /\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/;

// The 3 production strings with no state token. Keyed by exact string (data is fixed).
const FALLBACK: Record<string, string> = {
  "Melbourne South-East": "VIC", // HUB-5210
  "Airlie Beach, Australia": "QLD", // HUB-5527
  "South Australia, Australia": "SA", // IES-0021165 (spelled out, not abbreviated)
};

export function deriveState(production: string): string {
  const m = production.match(STATE);
  if (m) return m[1] ?? "unknown";
  return FALLBACK[production] ?? "unknown";
}
