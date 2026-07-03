"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

// ponytail: filters + selection are client state; the shareable artifact is the /compare
// URL (built on submit). No URL-sync for the list filters, and no useMemo — filtering 95
// objects on a dropdown change is microseconds, and the memos only invited a stale-closure
// footgun (hand-maintained dep arrays around `match`).
interface Group {
  epd_id: string;
  label: string;
  mixes: Product[];
}

export default function ProductBrowser({ products }: { products: Product[] }) {
  const router = useRouter();
  const [strength, setStrength] = useState("all");
  const [state, setState] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const strengthClasses = [
    ...new Set(products.map((p) => p.mpa).filter((v): v is number => v != null)),
  ].sort((a, b) => a - b);
  const hasNonStructural = products.some((p) => p.mpa == null);
  const stateOptions = [...new Set(products.map((p) => p.state))].sort();

  const match = (p: Product) => {
    const sOk =
      strength === "all" ||
      (strength === "non-structural" ? p.mpa == null : p.mpa === Number(strength));
    const stOk = state === "all" || p.state === state;
    return sOk && stOk;
  };
  const byA1A3 = (a: Product, b: Product) =>
    a.gwp_total.modules.A1A3 - b.gwp_total.modules.A1A3;

  const singles = products.filter((p) => !p.isCatalog && match(p)).sort(byA1A3);

  const byEpd = new Map<string, Group>();
  for (const p of products) {
    if (!p.isCatalog || !match(p)) continue;
    let g = byEpd.get(p.epd_id);
    if (!g) {
      g = { epd_id: p.epd_id, label: p.manufacturer, mixes: [] };
      byEpd.set(p.epd_id, g);
    }
    g.mixes.push(p);
  }
  const groups = [...byEpd.values()];
  for (const g of groups) g.mixes.sort(byA1A3);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleExpand = (epd: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(epd)) n.delete(epd);
      else n.add(epd);
      return n;
    });
  const compare = () => {
    if (selected.size >= 2) {
      router.push(`/compare?ids=${[...selected].map(encodeURIComponent).join(",")}`);
    }
  };

  const shown = singles.length + groups.reduce((a, g) => a + g.mixes.length, 0);

  return (
    <div className="browser">
      <div className="filters">
        <label>
          Strength{" "}
          <select value={strength} onChange={(e) => setStrength(e.target.value)}>
            <option value="all">All</option>
            {strengthClasses.map((c) => (
              <option key={c} value={c}>
                {c} MPa
              </option>
            ))}
            {hasNonStructural && <option value="non-structural">Non-structural (CLSM)</option>}
          </select>
        </label>
        <label>
          Location{" "}
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All AU</option>
            {stateOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <span className="count">
          {shown} product{shown !== 1 ? "s" : ""}
        </span>
        <button className="cmp-btn" disabled={selected.size < 2} onClick={compare}>
          Compare ({selected.size}) →
        </button>
      </div>

      {selected.size > 0 && (
        <p className="selhint">
          {selected.size} selected
          {selected.size < 2 ? " — pick at least one more to compare" : ""}
        </p>
      )}

      <div className="grid">
        {singles.map((p) => (
          <ProductCard
            key={p.product_id}
            p={p}
            selected={selected.has(p.product_id)}
            onToggle={toggle}
          />
        ))}
        {groups.map((g) => (
          <div key={g.epd_id} className="group">
            <button className="ghead" onClick={() => toggleExpand(g.epd_id)}>
              <span className="gexp">{expanded.has(g.epd_id) ? "▾" : "▸"}</span>
              <span>
                <span className="gname">
                  {g.label} — {g.mixes.length} mix{g.mixes.length !== 1 ? "es" : ""}
                </span>
                <span className="cmeta">
                  <span className="badge">catalog / industry-avg</span> shares one end-of-life
                  figure + plant location
                </span>
              </span>
            </button>
            {expanded.has(g.epd_id) && (
              <div className="gmixes">
                {g.mixes.map((p) => (
                  <ProductCard
                    key={p.product_id}
                    p={p}
                    selected={selected.has(p.product_id)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {shown === 0 && <p className="empty">No products match these filters.</p>}
    </div>
  );
}
