import type { ReactNode } from "react";
import Link from "next/link";
import { getProduct } from "@/lib/data";
import {
  AC_STAGES,
  D_STAGE,
  stageCell,
  declaredACTotal,
  round3,
  strengthLabel,
} from "@/lib/lifecycle";
import SourceLink from "@/components/SourceLink";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Full single-EPD detail — everything the comparison view strips out to stay comparable:
// programme/PCR/verifier/validity, plant list, density, A1–A3 composition, extraction notes.
// Every figure still deep-links to its source page.
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next already URL-decodes route params
  const p = getProduct(id);

  if (!p) {
    return (
      <main className="page">
        <p className="crumb">
          <Link href="/">← All products</Link>
        </p>
        <h1>Product not found</h1>
        <p className="empty">
          No product with id <code>{id}</code>. <Link href="/">Back to the list →</Link>
        </p>
      </main>
    );
  }

  const m = p.gwp_total.modules;
  const total = declaredACTotal(m);
  const d = stageCell(m, D_STAGE);
  const src = p.source.file;
  const cs = p.compressive_strength;
  const extras = p.summary_extras;

  return (
    <main className="page detail">
      <p className="crumb">
        <Link href="/">← All products</Link>
      </p>
      <h1>{p.product_name}</h1>
      <p className="lead">
        {p.manufacturer} · {p.program_operator}
        {p.regional_operator ? ` / ${p.regional_operator}` : ""}
        {p.isCatalog && (
          <span className="badge" style={{ marginLeft: 8 }}>
            catalog / industry-avg
          </span>
        )}
      </p>

      <section className="d-headline">
        <span className="cnum">{round3(m.A1A3)}</span>
        <span className="cunit">
          {" "}
          {p.gwp_total.unit} / {p.gwp_total.per} · A1–A3 (product stage){" "}
        </span>
        <SourceLink file={src} page={p.gwp_total.source_page} />
        {p.gwp_a1a3_split && (
          <div className="cmeta">
            composition — fossil {round3(p.gwp_a1a3_split.fossil)} · biogenic{" "}
            {round3(p.gwp_a1a3_split.biogenic)} · luluc {round3(p.gwp_a1a3_split.luluc)}{" "}
            <SourceLink file={src} page={p.gwp_a1a3_split.source_page} />
          </div>
        )}
      </section>

      <h2>Life-cycle carbon by stage</h2>
      <table className="d-stages">
        <tbody>
          {AC_STAGES.map((s) => {
            const c = stageCell(m, s);
            return (
              <tr key={s.key} className={s.key === "A1A3" ? "headline" : ""}>
                <th>
                  <span className="short">{s.short}</span>{" "}
                  <span className="stagelabel">{s.label}</span>
                </th>
                <td>
                  {c.kind === "value" ? (
                    <>
                      <span className="num">{round3(c.n)}</span>
                      {c.partialND && (
                        <span className="partial"> excl. {c.partialND.join(", ")} (ND)</span>
                      )}{" "}
                      <SourceLink file={src} page={p.gwp_total.source_page} />
                    </>
                  ) : (
                    <span className="nd">Not declared</span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="subtotal">
            <th>
              Σ declared A–C{" "}
              <span className="stagelabel">computed — declared modules only, excludes D</span>
            </th>
            <td>
              <span className="num">{round3(total.sum)}</span>
              {total.excludedNDStages.length > 0 && (
                <span className="partial"> excl. {total.excludedNDStages.join(", ")} (ND)</span>
              )}
              {total.partialStages.length > 0 && (
                <span className="partial"> partial: {total.partialStages.join(", ")}</span>
              )}
            </td>
          </tr>
          <tr className="drow">
            <th>
              <span className="short">D</span>{" "}
              <span className="stagelabel">
                Beyond system boundary — credit if −, load if +; never in an A–C total
              </span>
            </th>
            <td>
              {d.kind === "value" ? (
                <>
                  <span className="num">{round3(d.n)}</span>{" "}
                  <SourceLink file={src} page={p.gwp_total.source_page} />
                </>
              ) : (
                <span className="nd">Not declared</span>
              )}
            </td>
          </tr>
          {p.gwp_a1a3_alt && (
            <tr className="altrow">
              <th>
                <span className="badge-alt">+A1 / CML</span> A1–A3 alternative method —{" "}
                <em>not comparable with +A2</em>
              </th>
              <td>
                <span className="num muted">{round3(p.gwp_a1a3_alt.value)}</span>{" "}
                <SourceLink file={src} page={p.gwp_a1a3_alt.source_page} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="note">
        EN 15804 <strong>+A2</strong>, {p.gwp_total.unit} per {p.gwp_total.per}. “Not declared”
        means the module wasn’t assessed — it is <strong>not</strong> zero and is never summed.
        Module <strong>D</strong> is shown separately and never added into an A–C total.
      </p>

      {(extras?.total_energy_use_kwh_a1a3 || extras?.net_freshwater_use_m3_a1a3) && (
        <>
          <h2>Other declared indicators (A1–A3)</h2>
          <dl className="facts">
            {extras?.total_energy_use_kwh_a1a3 && (
              <Fact label="Total energy use">
                {round3(extras.total_energy_use_kwh_a1a3.value)} kWh{" "}
                <SourceLink file={src} page={extras.total_energy_use_kwh_a1a3.source_page} />
              </Fact>
            )}
            {extras?.net_freshwater_use_m3_a1a3 && (
              <Fact label="Net freshwater use">
                {round3(extras.net_freshwater_use_m3_a1a3.value)} m³{" "}
                <SourceLink file={src} page={extras.net_freshwater_use_m3_a1a3.source_page} />
              </Fact>
            )}
          </dl>
        </>
      )}

      <h2>Product</h2>
      <dl className="facts">
        <Fact label="Compressive strength">
          {strengthLabel(p.mpa)}
          {cs.raw_class ? ` (${cs.raw_class}${cs.test_age_days ? `, ${cs.test_age_days} d` : ""})` : ""} ·{" "}
          {cs.standard} <SourceLink file={src} page={cs.source_page} />
        </Fact>
        <Fact label="Manufacturing location">
          {p.location.production} ({p.location.country}){" "}
          <SourceLink file={src} page={p.location.source_page} />
          {p.location.sites?.length ? (
            <div className="cmeta">plants: {p.location.sites.join(", ")}</div>
          ) : null}
        </Fact>
        <Fact label="Declared unit">
          {p.declared_unit.unit} · {p.declared_unit.mass_kg} kg (density){" "}
          <SourceLink file={src} page={p.declared_unit.source_page} />
        </Fact>
      </dl>

      <h2>Declaration</h2>
      <dl className="facts">
        <Fact label="Programme">
          {p.program_operator}
          {p.regional_operator ? ` · ${p.regional_operator}` : ""}
        </Fact>
        <Fact label="Standard">{p.standard}</Fact>
        <Fact label="PCR">{p.pcr}</Fact>
        <Fact label="LCA tool">{p.lca_tool}</Fact>
        <Fact label="Verification">
          {p.verification.type} — {p.verification.verifier}
        </Fact>
        <Fact label="Valid">
          {p.published} → {p.valid_until}
        </Fact>
        <Fact label="Scope">{p.scope}</Fact>
        <Fact label="Source EPD">
          <SourceLink file={src} page={1} /> <span className="cmeta">{src}</span>
        </Fact>
      </dl>

      {p.notes && p.notes.length > 0 && (
        <>
          <h2>Extraction notes</h2>
          <ul className="notes">
            {p.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="note">
            Transparency notes recorded during extraction — source ambiguities, typos, and
            judgement calls. Never silently “corrected”.
          </p>
        </>
      )}
    </main>
  );
}
