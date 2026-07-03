// Mirrors data/schema.md (v1.2). The source of truth is the JSON; these types
// are the app's read-side view of it.

// A1/A2/A3 may be "incl" (declared, rolled into A1A3). Other modules are number | "ND".
// "ND" = not declared (never render as 0, never sum). A1A3 is ALWAYS a number.
export type ModuleValue = number | "ND";
export type ProductStageValue = number | "ND" | "incl";

export interface Modules {
  A1: ProductStageValue;
  A2: ProductStageValue;
  A3: ProductStageValue;
  A1A3: number;
  A4: ModuleValue;
  A5: ModuleValue;
  B1: ModuleValue;
  B2: ModuleValue;
  B3: ModuleValue;
  B4: ModuleValue;
  B5: ModuleValue;
  B6: ModuleValue;
  B7: ModuleValue;
  C1: ModuleValue;
  C2: ModuleValue;
  C3: ModuleValue;
  C4: ModuleValue;
  D: ModuleValue;
}

export interface CompressiveStrength {
  raw_class: string;
  value_mpa: number | null;
  test_age_days: number | null;
  standard: string;
  source_page: number;
}

export interface EpdLocation {
  production: string;
  sites: string[];
  country: string;
  source_page: number;
}

export interface DeclaredUnit {
  unit: string;
  mass_kg: number;
  source_page: number;
}

export interface GwpTotal {
  methodology: string;
  unit: string;
  per: string;
  source_page: number;
  modules: Modules;
}

export interface Gwpa1a3Split {
  fossil: number;
  biogenic: number;
  luluc: number;
  source_page: number;
}

export interface Gwpa1a3Alt {
  methodology: string;
  value: number;
  source_page: number;
}

export interface SourcedValue {
  value: number;
  source_page: number;
}

export interface SummaryExtras {
  total_energy_use_kwh_a1a3?: SourcedValue;
  net_freshwater_use_m3_a1a3?: SourcedValue;
}

export interface Verification {
  type: string;
  verifier: string;
}

export interface Source {
  file: string;
  drive_id?: string;
}

// Fields that vary per product — top-level for single-product EPDs, per-entry for catalogs.
export interface ProductFields {
  product_name: string;
  compressive_strength: CompressiveStrength;
  location: EpdLocation;
  declared_unit: DeclaredUnit;
  gwp_total: GwpTotal;
  gwp_a1a3_split?: Gwpa1a3Split;
  gwp_a1a3_alt?: Gwpa1a3Alt;
  summary_extras?: SummaryExtras;
}

// Shared identity — always top-level.
export interface EpdIdentity {
  epd_id: string;
  product_name: string; // generic for catalog EPDs; specific for single-product
  manufacturer: string;
  program_operator: string;
  regional_operator?: string;
  published: string;
  valid_until: string;
  standard: string;
  pcr: string;
  lca_tool: string;
  verification: Verification;
  scope: string;
  source: Source;
  notes: string[];
}

// One raw JSON file: identity + (single-product fields at top level) OR (products[]).
// product_name stays required (from identity); the other product fields are optional
// at the top level because a catalog EPD carries them per-entry in products[].
export type RawEpd = EpdIdentity &
  Partial<Omit<ProductFields, "product_name">> & {
    products?: ProductFields[];
  };

// Flattened + derived — the unit the app actually renders and compares.
export interface Product extends EpdIdentity, ProductFields {
  product_id: string; // epd_id, or `${epd_id}--${mix_code}` for catalog entries
  state: string; // derived AU state, or "unknown"
  mpa: number | null; // compressive_strength.value_mpa, hoisted for filtering
  isCatalog: boolean;
}
