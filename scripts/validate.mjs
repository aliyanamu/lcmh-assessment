#!/usr/bin/env node
// validate.mjs — provenance + consistency checks for data/*.json (EPD extractions).
// ponytail: hardcoded invariants, no schema lib — hand-authored files don't need one.
// Errors (exit 1) = structural/provenance breaches. Flags = review-by-human, not rejections.
// Handles both single-product records and multi-product catalog EPDs (top-level `products[]`).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const PDFS = join(ROOT, 'source-pdfs');

const MODULES = ['A1','A2','A3','A1A3','A4','A5','B1','B2','B3','B4','B5','B6','B7','C1','C2','C3','C4','D'];
const PRODUCT = ['A1','A2','A3'];
const SHARED_REQUIRED = ['epd_id','manufacturer','program_operator','standard','scope','source'];

const num = (x) => typeof x === 'number' && Number.isFinite(x);
const withinTol = (a, b, rel, abs) => Math.abs(a - b) <= Math.max(rel * Math.abs(b), abs);

function checkProvenance(o, errs, ctx) {
  const blocks = { compressive_strength: o.compressive_strength, location: o.location,
    declared_unit: o.declared_unit, gwp_total: o.gwp_total,
    gwp_a1a3_split: o.gwp_a1a3_split, gwp_a1a3_alt: o.gwp_a1a3_alt };
  for (const [name, b] of Object.entries(blocks))
    if (b && !num(b.source_page)) errs.push(`${ctx}${name}: missing/invalid source_page`);
  // summary_extras children each carry their own {value, source_page} — schema.md: every figure block has provenance.
  for (const [name, b] of Object.entries(o.summary_extras ?? {}))
    if (b && !num(b.source_page)) errs.push(`${ctx}summary_extras.${name}: missing/invalid source_page`);
}

// Validate one product-like object (a single-product record, or one entry of products[]).
function checkProduct(o, errs, flags, ctx) {
  if (o.product_name == null) errs.push(`${ctx}missing product_name`);
  if (o.declared_unit == null) errs.push(`${ctx}missing declared_unit`);
  if (o.gwp_total == null) { errs.push(`${ctx}missing gwp_total`); return; }
  checkProvenance(o, errs, ctx);

  const m = o.gwp_total.modules ?? {};
  if (!num(m.A1A3)) errs.push(`${ctx}gwp_total.modules.A1A3 must be a number (the comparable product-stage figure)`);
  for (const k of MODULES) {
    if (!(k in m)) continue;
    const v = m[k];
    const allowIncl = PRODUCT.includes(k);
    const ok = num(v) || v === 'ND' || (allowIncl && v === 'incl');
    if (!ok) errs.push(`${ctx}module ${k}: must be number|"ND"${allowIncl ? '|"incl"' : ''}, got ${JSON.stringify(v)}`);
  }
  // Closed vocabulary: a typo'd key ('C5', 'b1', trailing space) would hide a carbon figure from validator and app.
  for (const k of Object.keys(m))
    if (!MODULES.includes(k)) errs.push(`${ctx}unknown module key ${JSON.stringify(k)} — not in EN 15804 A1..D vocabulary (typo?)`);
  if (num(m.A1) && num(m.A2) && num(m.A3) && num(m.A1A3)) {
    const sum = m.A1 + m.A2 + m.A3;
    if (!withinTol(sum, m.A1A3, 0.015, 0.05)) flags.push(`${ctx}A1+A2+A3=${sum.toFixed(2)} vs A1A3=${m.A1A3} (>1.5%)`);
  }
  const s = o.gwp_a1a3_split;
  if (s && num(s.fossil) && num(s.biogenic) && num(s.luluc) && num(m.A1A3)) {
    const sum = s.fossil + s.biogenic + s.luluc;
    if (!withinTol(sum, m.A1A3, 0.01, 0.05)) flags.push(`${ctx}fossil+biogenic+luluc=${sum.toFixed(2)} vs A1A3=${m.A1A3} (>1%)`);
  }
  if (/m3|m³|cubic/i.test(o.declared_unit?.unit ?? '') && num(m.A1A3) && (m.A1A3 < 100 || m.A1A3 > 650))
    flags.push(`${ctx}A1A3 GWP ${m.A1A3} kg/m³ outside [100,650] — review (low-carbon/geopolymer/CLSM or data error)`);
}

const files = readdirSync(DATA).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
if (!files.length) { console.error('No data/*.json found.'); process.exit(1); }

let hardFails = 0, totalFlags = 0;

for (const f of files) {
  const errs = [], flags = [];
  let d;
  try { d = JSON.parse(readFileSync(join(DATA, f), 'utf8')); }
  catch (e) { console.log(`✗ ${f}\n    ERROR  invalid JSON: ${e.message}`); hardFails++; continue; }

  for (const k of SHARED_REQUIRED) if (d[k] == null) errs.push(`missing required field: ${k}`);
  if (d.source?.file && !existsSync(join(PDFS, d.source.file)))
    errs.push(`source.file not in source-pdfs/: ${d.source.file}`);

  if (Array.isArray(d.products)) {           // multi-product catalog EPD
    if (!d.products.length) errs.push('products[] is empty');
    d.products.forEach((p, i) => checkProduct(p, errs, flags, `products[${i}] `));
  } else {                                    // single-product record
    checkProduct(d, errs, flags, '');
  }

  if (errs.length) { hardFails++; console.log(`✗ ${f}`); errs.forEach((e) => console.log(`    ERROR  ${e}`)); }
  else console.log(`✓ ${f}${Array.isArray(d.products) ? ` (${d.products.length} products)` : ''}`);
  const hasNotes = Array.isArray(d.notes) && d.notes.length;
  if (flags.length) console.log(`    (${flags.length} flag${flags.length > 1 ? 's' : ''}${hasNotes ? ', see notes[]' : ''})`);
  flags.slice(0, 4).forEach((x) => console.log(`    flag   ${x}`));
  if (flags.length > 4) console.log(`    flag   … and ${flags.length - 4} more`);
  totalFlags += flags.length;
}

console.log(`\n${files.length} file(s) · ${hardFails} with errors · ${totalFlags} flag(s).`);
process.exit(hardFails ? 1 : 0);
