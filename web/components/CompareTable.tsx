import type { Product } from "@/lib/types";
import {
  AC_STAGES,
  D_STAGE,
  STAGES,
  stageCell,
  declaredACTotal,
  round3,
  strengthLabel,
} from "@/lib/lifecycle";
import SourceLink from "./SourceLink";

function Bar({ n, max, credit }: { n: number; max: number; credit?: boolean }) {
  const pct = max > 0 ? (Math.abs(n) / max) * 100 : 0;
  return (
    <span className="bar" aria-hidden>
      <span className={credit ? "fill credit" : "fill"} style={{ width: `${pct}%` }} />
    </span>
  );
}

export default function CompareTable({ products }: { products: Product[] }) {
  const first = products[0];
  const unit = first ? first.gwp_total.unit : "kg CO2e";
  const per = first ? first.gwp_total.per : "1 m3";

  // Per-row max |value| across products, for honest same-scale bars within a stage.
  const rowMax: Record<string, number> = {};
  for (const s of STAGES) {
    let m = 0;
    for (const p of products) {
      const c = stageCell(p.gwp_total.modules, s);
      if (c.kind === "value") m = Math.max(m, Math.abs(c.n));
    }
    rowMax[s.key] = m;
  }

  const showAlt = products.some((p) => p.gwp_a1a3_alt);

  return (
    <div className="cmp-wrap">
      <table className="cmp">
        <thead>
          <tr>
            <th className="rowhead corner">
              Life-cycle stage
              <br />
              <span className="unit">
                {unit} / {per}
              </span>
            </th>
            {products.map((p) => (
              <th key={p.product_id} className="prod">
                <div className="pname">{p.product_name}</div>
                <div className="pmeta">{p.manufacturer}</div>
                <div className="pmeta">
                  {strengthLabel(p.mpa)} · {p.state}
                </div>
                {p.mpa != null && (
                  <div className="pmeta">
                    {p.compressive_strength.test_age_days != null
                      ? `${p.compressive_strength.test_age_days}-day strength`
                      : "test age not stated"}
                  </div>
                )}
                {p.isCatalog && <div className="badge">catalog / industry-avg</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {AC_STAGES.map((s) => (
            <tr key={s.key} className={s.key === "A1A3" ? "headline" : ""}>
              <th className="rowhead">
                <span className="short">{s.short}</span>{" "}
                <span className="stagelabel">{s.label}</span>
              </th>
              {products.map((p) => {
                const c = stageCell(p.gwp_total.modules, s);
                // "incl" can't reach a stage cell (only combined A1A3 is shown, always a
                // number), so a non-value cell is always ND.
                return (
                  <td key={p.product_id}>
                    {c.kind === "value" ? (
                      <>
                        <span className="num">{round3(c.n)}</span>
                        <Bar n={c.n} max={rowMax[s.key] ?? 0} credit={c.n < 0} />
                        {c.partialND && (
                          <span className="partial">excl. {c.partialND.join(", ")} (ND)</span>
                        )}
                        <div className="prov">
                          <SourceLink file={p.source.file} page={p.gwp_total.source_page} />
                        </div>
                      </>
                    ) : (
                      <span className="nd">Not declared</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="subtotal">
            <th className="rowhead">
              Σ declared A–C
              <br />
              <span className="unit">computed — declared modules only, excludes D</span>
            </th>
            {products.map((p) => {
              const t = declaredACTotal(p.gwp_total.modules);
              return (
                <td key={p.product_id}>
                  <span className="num">{round3(t.sum)}</span>
                  {t.excludedNDStages.length > 0 && (
                    <span className="partial">
                      excl. {t.excludedNDStages.join(", ")} (not declared)
                    </span>
                  )}
                  {t.partialStages.length > 0 && (
                    <span className="partial">partial: {t.partialStages.join(", ")}</span>
                  )}
                </td>
              );
            })}
          </tr>

          <tr className="drow">
            <th className="rowhead">
              <span className="short">D</span>{" "}
              <span className="stagelabel">
                Beyond the system boundary — a credit if negative, a load if positive; never added
                into an A–C total
              </span>
            </th>
            {products.map((p) => {
              const d = stageCell(p.gwp_total.modules, D_STAGE);
              return (
                <td key={p.product_id}>
                  {d.kind === "value" ? (
                    <>
                      <span className="num">{round3(d.n)}</span>
                      <Bar n={d.n} max={rowMax["D"] ?? 0} credit={d.n < 0} />
                      <div className="prov">
                        <SourceLink file={p.source.file} page={p.gwp_total.source_page} />
                      </div>
                    </>
                  ) : (
                    <span className="nd">Not declared</span>
                  )}
                </td>
              );
            })}
          </tr>

          {showAlt && (
            <tr className="altrow">
              <th className="rowhead">
                <span className="badge-alt">+A1 / CML</span> A1–A3, alternative method —{" "}
                <em>not comparable with +A2</em>
              </th>
              {products.map((p) => (
                <td key={p.product_id}>
                  {p.gwp_a1a3_alt ? (
                    <>
                      <span className="num muted">{round3(p.gwp_a1a3_alt.value)}</span>{" "}
                      <SourceLink file={p.source.file} page={p.gwp_a1a3_alt.source_page} />
                    </>
                  ) : (
                    <span className="nd">—</span>
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
