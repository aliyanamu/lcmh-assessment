# EPD Data — corpus & filename map

20 concrete EPDs → one `data/<epd_id>.json` each (**95 products** total: 19 single-product records + one 76-mix catalog). Source PDFs live in `../source-pdfs/`, kept **as received** — the exact original filename is stored in every record's `source.file` (the authoritative provenance link). See `schema.md` for the shape.

**Naming rule:** `<program>-<regnum>` — registration number verbatim from the document (no invented zero-padding), revision suffix (`-001`/`:003`) dropped, since the base number is unique in this corpus.

**GWP column below** = EN 15804 **+A2** GWP-total, modules **A1–A3**, kg CO₂e per m³ (the canonical cradle-to-gate figure; full stage-by-stage data is in each record). Not directly comparable across differing strength classes or `+A1`-vs-`+A2` methodologies — the app surfaces those caveats.

## EPD Hub (10)

| epd_id | product | manufacturer | strength | A1–A3 GWP | source PDF |
|---|---|---|---|---:|---|
| `HUB-5210` | Envirocrete® 40% 32MPa (Melbourne SE) | Boral Limited | 32 MPa | 275 | `EPD_HUB-5210_2026-06-27_en.pdf` |
| `HUB-5394` | AN3220100Enhanced | Tandy Concrete | 32 MPa | 232 | `EPD_HUB-5394_2026-06-27_en.pdf` |
| `HUB-5480` | ATILTS4020100Enhanced | Tandy Concrete | 40 MPa | 280 | `EPD_HUB-5480_2026-06-27_en.pdf` |
| `HUB-5527` | CTILTS4020100Enhanced | Tandy Concrete | 40 MPa | 284 | `EPD_HUB-5527_2026-06-27_en.pdf` |
| `HUB-5555` | 40MPa 20mm Enviro 50% SCM 100SL | Boral Limited | 40 MPa | 220 | `EPD_HUB-5555_2026-06-27_en.pdf` |
| `HUB-5556` | 50MPa 20mm Enviro 50% SCM 100SL | Boral Limited | 50 MPa | 268 | `EPD_HUB-5556_2026-06-27_en.pdf` |
| `HUB-5749` | N25/10/100 Xencrete | Entire Concrete | 25 MPa | 209 | `EPD_HUB-5749_2026-06-27_en.pdf` |
| `HUB-5882` | 40 MPa High Performance Concrete | Boral Limited | 40 MPa | 297 | `EPD_HUB-5882_2026-06-27_en.pdf` |
| `HUB-5943` | N50/20 Xencrete | Entire Concrete | 50 MPa | 310 | `EPD_HUB-5943_2026-06-27_en.pdf` |
| `HUB-5991` | N40/20 Xencrete | Entire Concrete | 40 MPa | 273 | `EPD_HUB-5991_2026-06-27_en.pdf` |

## EPD International / Australasia (IES) (10)

| epd_id | product | manufacturer | strength | A1–A3 GWP | source PDF | note |
|---|---|---|---|---:|---|---|
| `IES-0009353` | **76 mixes (catalog)** | Hallett Group Pty Ltd | 10–80 MPa | 73–495 | `epd-australasia-com-…-epd-ies-0009353-003-hallett-ready-mix-concrete-…pdf` | multi-product `products[]`; rev 003 |
| `IES-0014327` | GEOStone QX25MOR (S25 Moreton) | Holcim (Australia) Pty Ltd | 25 MPa | 237 | `epd-australasia-com-…-epd-ies-0014327-002-holcim-qld-seq-geostone-qx25mor-…pdf` | rev 002 |
| `IES-0014769` | P252080 — General use | Hanson Construction Materials Pty Ltd | 25 MPa | 127 | `EPD-IES-0014769_P252080.pdf` | declares B1–B7 + D (net burden) |
| `IES-0014785` | GE322LPF2 — General works | Heidelberg Materials Australia Pty Ltd | 32 MPa | 145 | `EPD-IES-0014785_Heidelberg_Woolworths-GE322LPF2.pdf` | |
| `IES-0014958` | HyLo-50 Normal-Class 25 MPa | Hymix Australia Pty Ltd | 25 MPa | 141 | `EPD-IES-0014958_Hymix_GE252WA06-3_2024-11-19.pdf` | filename code absent from PDF |
| `IES-0021165` | Futurecrete Normal Class GL:Slag 25 MPa | Adbri Limited | 25 MPa | 143.83 | `epd-ies-0021165-sn252f100.pdf` | no declared mass (null) |
| `IES-0021754` | AR2520 Premixed Concrete — General use | Aurora Construction Materials Epping | 25 MPa | 140 | `epd-ies-0021754-001-acm-rockbank-ar2520.pdf` | rev 001 |
| `IES-0023043` | Premix Concrete – S32MPa GreenCrete 70 | Piave Premix Concrete Pty Ltd | 32 MPa | 134 | `epd-ies-0023043-s32mpa-greencrete-70.pdf` | doc renders id "23043" |
| `IES-0029695` | ECOPact S25/20/100 (QE252M100) | Holcim (Australia) Pty Ltd | 25 MPa | 146 | `epd-australasia-com-…-epd-ies-0029695-001-holcim-qld-brisbane-ecopact-qe252m100-…pdf` | rev 001 |
| `IES-20602` | VIC Melbourne Metro ECOPact VE322EAMF | Holcim (Australia) Pty Ltd | 32 MPa | 105 | `epd-ies-20602-001-holcim-vic-melbourne-metro-ecopact-ve322eamf-epd.pdf` | 5-digit id (not padded); 56-day test |
