// Loads all 20 Part 1 EPD JSON files and flattens them into one Product[].
// Static imports (not fs.readdirSync) so the files are traced into the build —
// robust on Vercel even for the dynamic /compare route. The corpus is fixed at 20.
import type { EpdIdentity, Product, ProductFields, RawEpd } from "@/lib/types";
import { deriveState } from "@/lib/location";

import HUB_5210 from "@data/HUB-5210.json";
import HUB_5394 from "@data/HUB-5394.json";
import HUB_5480 from "@data/HUB-5480.json";
import HUB_5527 from "@data/HUB-5527.json";
import HUB_5555 from "@data/HUB-5555.json";
import HUB_5556 from "@data/HUB-5556.json";
import HUB_5749 from "@data/HUB-5749.json";
import HUB_5882 from "@data/HUB-5882.json";
import HUB_5943 from "@data/HUB-5943.json";
import HUB_5991 from "@data/HUB-5991.json";
import IES_0009353 from "@data/IES-0009353.json";
import IES_0014327 from "@data/IES-0014327.json";
import IES_0014769 from "@data/IES-0014769.json";
import IES_0014785 from "@data/IES-0014785.json";
import IES_0014958 from "@data/IES-0014958.json";
import IES_0021165 from "@data/IES-0021165.json";
import IES_0021754 from "@data/IES-0021754.json";
import IES_0023043 from "@data/IES-0023043.json";
import IES_0029695 from "@data/IES-0029695.json";
import IES_20602 from "@data/IES-20602.json";

// JSON imports infer widened literal types; the schema is the real contract (validate.mjs).
const RAW = [
  HUB_5210, HUB_5394, HUB_5480, HUB_5527, HUB_5555, HUB_5556, HUB_5749, HUB_5882, HUB_5943, HUB_5991,
  IES_0009353, IES_0014327, IES_0014769, IES_0014785, IES_0014958, IES_0021165, IES_0021754, IES_0023043, IES_0029695, IES_20602,
] as unknown as RawEpd[];

// Guard the JSON boundary: the casts below assert product blocks are present, so verify
// it at runtime rather than trust a cast. (validate.mjs is the primary gate in prebuild;
// this is belt-and-suspenders for the dynamic /compare path.)
function assertProductFields(
  p: Partial<ProductFields>,
  id: string,
): asserts p is ProductFields {
  if (!p.location || !p.gwp_total || !p.compressive_strength || !p.declared_unit) {
    throw new Error(
      `data: "${id}" is missing a required product block (location / gwp_total / compressive_strength / declared_unit)`,
    );
  }
}

function toProducts(epd: RawEpd): Product[] {
  if (epd.products && epd.products.length) {
    const { products, ...identity } = epd;
    return products.map((p) => {
      assertProductFields(p, `${epd.epd_id}--${p.product_name}`);
      return {
        ...(identity as EpdIdentity),
        ...p,
        product_id: `${epd.epd_id}--${p.product_name}`,
        state: deriveState(p.location.production),
        mpa: p.compressive_strength.value_mpa,
        isCatalog: true,
      };
    });
  }
  const single = epd as Partial<ProductFields> & EpdIdentity;
  assertProductFields(single, epd.epd_id);
  return [
    {
      ...single,
      product_id: epd.epd_id,
      state: deriveState(single.location.production),
      mpa: single.compressive_strength.value_mpa,
      isCatalog: false,
    },
  ];
}

export const PRODUCTS: Product[] = RAW.flatMap(toProducts);

// product_id travels through the comma-joined /compare?ids= param — a comma inside one
// would corrupt selection. The corpus is comma-free; assert it so future data can't break it.
for (const p of PRODUCTS) {
  if (p.product_id.includes(",")) {
    throw new Error(`data: product_id "${p.product_id}" contains a comma — breaks the /compare ids delimiter`);
  }
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.product_id === id);
}

export function getProducts(ids: string[]): { found: Product[]; missing: string[] } {
  const found: Product[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const p = getProduct(id);
    if (p) found.push(p);
    else missing.push(id);
  }
  return { found, missing };
}
