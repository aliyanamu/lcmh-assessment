import Link from "next/link";
import { getProducts } from "@/lib/data";
import { comparability } from "@/lib/lifecycle";
import CompareTable from "@/components/CompareTable";
import Warnings from "@/components/Warnings";

// URL-driven, shareable: /compare?ids=HUB-5943,IES-0029695
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  // Dedupe: repeated ids would render duplicate columns with colliding React keys.
  const idList = [
    ...new Set(
      (ids ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  const { found, missing } = getProducts(idList);

  return (
    <main className="page">
      <p className="crumb">
        <Link href="/">← Back to all products</Link>
      </p>
      <h1>Compare — embodied carbon by life-cycle stage</h1>

      {missing.length > 0 && (
        <p className="warn">
          ⚠ {missing.length} product{missing.length > 1 ? "s" : ""} not found and omitted:{" "}
          {missing.join(", ")}
        </p>
      )}

      {found.length === 0 ? (
        <p className="empty">
          No products selected. <Link href="/">Pick products to compare →</Link>
        </p>
      ) : (
        <>
          <Warnings items={comparability(found)} />
          <CompareTable products={found} />
          <p className="note">
            Every figure links to its source EPD page. <strong>“Not declared”</strong> means the
            module was not assessed — it is <strong>not</strong> zero and is never summed. Module
            <strong> D</strong> is an end-of-life credit shown separately and never added into an
            A–C total. Values are EN 15804 <strong>+A2</strong>, kg CO₂e per declared unit.
          </p>
        </>
      )}
    </main>
  );
}
