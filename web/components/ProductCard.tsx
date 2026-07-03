"use client";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { strengthLabel, round3 } from "@/lib/lifecycle";
import SourceLink from "./SourceLink";

// One selectable product. Used for single-product cards and (expanded) catalog mixes.
export default function ProductCard({
  p,
  selected,
  onToggle,
}: {
  p: Product;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className={`card${selected ? " sel" : ""}`}>
      <div className="ctop">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(p.product_id)}
          aria-label={`Select ${p.product_name} to compare`}
        />
        <Link href={`/product/${encodeURIComponent(p.product_id)}`} className="cname">
          {p.product_name}
        </Link>
      </div>
      <div className="cmeta">{p.manufacturer}</div>
      <div className="cmeta">
        {strengthLabel(p.mpa)} · {p.state}
      </div>
      {p.isCatalog && (
        <div>
          <span className="badge">catalog / industry-avg</span>
        </div>
      )}
      <div className="chead">
        <span className="cnum">{round3(p.gwp_total.modules.A1A3)}</span>
        <span className="cunit"> {p.gwp_total.unit} · A1–A3</span>
      </div>
      <div className="cprov">
        <SourceLink file={p.source.file} page={p.gwp_total.source_page} />
      </div>
    </div>
  );
}
