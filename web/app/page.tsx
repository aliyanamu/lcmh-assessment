import { PRODUCTS } from "@/lib/data";
import ProductBrowser from "@/components/ProductBrowser";

export default function Home() {
  return (
    <main className="page">
      <h1>Compare concrete products by embodied carbon</h1>
      <p className="lead">
        Pick two or more products, then compare their carbon across the full life cycle — stage by
        stage, not one headline number. Every figure links to its source EPD. A stage that wasn’t
        declared is shown as such, never as zero.
      </p>
      <ProductBrowser products={PRODUCTS} />
    </main>
  );
}
