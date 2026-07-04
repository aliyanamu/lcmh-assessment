#!/usr/bin/env python3
# verify_bridge.py — provenance by construction.
#
# Each numeric carbon figure in data/*.json is paired, in bridge/<epd_id>.json, with the VERBATIM
# token from the source PDF (the "bridge"). Verification is then exact and dumb:
#     raw  ⊂  page_text        (grep-able existence — the number really is on the cited page)
#     parse(raw) ≈ value       (faithful transform — the JSON number is that token, honestly read)
# No fuzzy page-scanning, no coincidence guards, no dual tolerances — that machinery only existed to
# *recover* the raw token an earlier verifier had thrown away. Capture it once at bootstrap and the
# check collapses to two lines. A figure with no source token (image-rendered table) surfaces as
# UNPROVEN rather than silently passing — honest about what can't be text-proven.
#
#   python3 scripts/verify_bridge.py --bootstrap   # (re)generate bridge/ from data + PDFs
#   python3 scripts/verify_bridge.py               # verify data <-> bridge <-> PDF
#   python3 scripts/verify_bridge.py --selftest    # tokeniser/parse self-check
import json, re, sys
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent.parent
DATA, PDFS, BRIDGE = ROOT / 'data', ROOT / 'source-pdfs', ROOT / 'bridge'

DASH = '-−‐‑‒–—'   # ascii hyphen-minus + unicode minus/hyphen/nb-hyphen/figure/en/em dash
TOKEN_RE = re.compile(rf'[{DASH}]?(?:\d[\d.,]*\d|\d)(?:[eE][{DASH}+]?\d+)?')  # a number as printed
CAP_REL = 5e-4     # capture/faithful tolerance: tight enough that 309 != 310, loose for repr noise

def token_values(tok):
    # A printed token is ambiguous US vs EU (esp. comma-decimal mantissas like "1,59E+01" = 15.9);
    # return every plausible reading — the JSON value it's matched against picks the intended one.
    t = tok
    for ch in DASH[1:]: t = t.replace(ch, '-')          # unicode dashes -> ascii '-'
    out = set()
    for s in (t.replace(',', ''), t.replace('.', '').replace(',', '.')):  # comma=thousands | comma=decimal
        try: out.add(float(s))
        except ValueError: pass
    return out

def matches(tok, value):   # does any reading of this printed token equal value? (magnitude; D shows unsigned)
    return any(abs(abs(v) - abs(value)) <= abs(value) * CAP_REL + 1e-9 for v in token_values(tok))

class Pdf:
    def __init__(self, path):
        self.doc = fitz.open(path); self.npages = self.doc.page_count; self._t = {}
    def text(self, pg):
        if pg not in self._t: self._t[pg] = self.doc[pg - 1].get_text()
        return self._t[pg]
    def close(self): self.doc.close()

def product_figures(o, prefix):
    # (path, value, cited_page) for every numeric carbon figure. ND/incl carry no source token by
    # definition, so they are intentionally absent.
    du = o.get('declared_unit')
    if du and isinstance(du.get('mass_kg'), (int, float)):
        yield f'{prefix}declared_unit.mass_kg', du['mass_kg'], du['source_page']
    gt = o.get('gwp_total') or {}
    for k, v in (gt.get('modules') or {}).items():
        if isinstance(v, (int, float)): yield f'{prefix}modules.{k}', v, gt['source_page']
    sp = o.get('gwp_a1a3_split')
    if sp:
        for k in ('fossil', 'biogenic', 'luluc'):
            if isinstance(sp.get(k), (int, float)): yield f'{prefix}split.{k}', sp[k], sp['source_page']
    alt = o.get('gwp_a1a3_alt')
    if alt and isinstance(alt.get('value'), (int, float)):
        yield f'{prefix}alt.value', alt['value'], alt['source_page']
    for k, b in (o.get('summary_extras') or {}).items():
        if b and isinstance(b.get('value'), (int, float)): yield f'{prefix}extras.{k}', b['value'], b['source_page']

def iter_figures(d):
    if isinstance(d.get('products'), list):
        for i, p in enumerate(d['products']): yield from product_figures(p, f'products[{i}].')
    else:
        yield from product_figures(d, '')

def data_files():
    return sorted(f for f in DATA.glob('*.json') if not f.name.startswith('_'))

# --- bootstrap: capture the verbatim token for each figure -------------------------------------
def find_token(pdf, value, cited):
    # Search cited page first, then +-1, then the rest of the doc; return the ACTUAL page where the
    # token lives (per-figure provenance, finer than the block's source_page) + the literal string.
    N = pdf.npages
    order = [cited] if 1 <= cited <= N else []          # closest-to-citation first: a real nearby page
    for delta in range(1, N):                           # beats a far coincidental match of a common value
        for p in (cited - delta, cited + delta):
            if 1 <= p <= N and p not in order: order.append(p)
    for p in order:
        for m in TOKEN_RE.finditer(pdf.text(p)):
            if matches(m.group(), value):
                return p, m.group()
    return None, None

def bootstrap():
    BRIDGE.mkdir(exist_ok=True)
    review = 0
    for f in data_files():
        d = json.loads(f.read_text())
        pdf = Pdf(PDFS / d['source']['file'])
        figs, none_n, far_n = {}, 0, 0
        for path, value, cited in iter_figures(d):
            page, raw = find_token(pdf, value, cited)
            figs[path] = {'value': value, 'page': page, 'raw': raw}
            if raw is None: none_n += 1
            elif abs(page - cited) > 1: far_n += 1
        pdf.close()
        out = {'epd_id': d['epd_id'], 'source_file': d['source']['file'], 'figures': figs}
        (BRIDGE / f"{d['epd_id']}.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
        note = []
        if none_n: note.append(f'{none_n} no-token (image/OCR?)')
        if far_n: note.append(f'{far_n} off-page (>±1 from citation)')
        flag = f"  ← REVIEW: {', '.join(note)}" if note else ''
        review += bool(note)
        print(f'  bridge/{d["epd_id"]}.json  ({len(figs)} figures){flag}')
    print(f'\nWrote {len(data_files())} bridge file(s); {review} need a human glance.')
    return 0

# --- verify: exact existence + faithful transform ----------------------------------------------
def verify():
    if not BRIDGE.exists():
        print('No bridge/ — run with --bootstrap first.'); return 1
    errs_total = flags_total = 0
    for f in data_files():
        d = json.loads(f.read_text())
        bpath = BRIDGE / f"{d['epd_id']}.json"
        if not bpath.exists():
            print(f'✗ {f.name}\n    ERROR  no bridge/{d["epd_id"]}.json (run --bootstrap)'); errs_total += 1; continue
        bridge = json.loads(bpath.read_text())['figures']
        pdf = Pdf(PDFS / d['source']['file'])
        errs, flags = [], []
        for path, value, cited in iter_figures(d):
            e = bridge.get(path)
            if e is None:
                errs.append(f'{path}: absent from bridge (stale — re-bootstrap)'); continue
            bv = e.get('value')
            if not isinstance(bv, (int, float)) or abs(bv - value) > abs(value) * CAP_REL + 1e-9:
                errs.append(f'{path}: bridge value {bv} != data {value} (stale bridge — re-bootstrap)'); continue
            raw, page = e.get('raw'), e.get('page')
            if raw is None:
                flags.append(f'{path}={value}: UNPROVEN — no source token (image-rendered table → OCR / see notes[])'); continue
            if raw not in pdf.text(page):
                errs.append(f'{path}: bridge raw {raw!r} not on page {page} (corrupt/stale bridge)'); continue
            if not matches(raw, value):
                errs.append(f'{path}={value}: raw {raw!r} reads as {sorted(token_values(raw))} — transform mismatch'); continue
            if abs(page - cited) > 1:
                flags.append(f'{path}={value}: sourced from page {page}, block cites {cited} (per-figure page differs)')
        pdf.close()
        if errs:
            errs_total += 1; print(f'✗ {f.name}')
            for e in errs: print(f'    ERROR  {e}')
        else:
            proven = sum(1 for _ in iter_figures(d)) - len(flags)
            print(f'✓ {f.name}  ({proven} proven)')
        if flags:
            print(f'    ({len(flags)} flag{"s" if len(flags) > 1 else ""})')
            for x in flags[:6]: print(f'    flag   {x}')
            if len(flags) > 6: print(f'    flag   … and {len(flags) - 6} more')
        flags_total += len(flags)
    print(f'\n{len(data_files())} file(s) · {errs_total} with errors · {flags_total} flag(s).')
    return 1 if errs_total else 0

def selftest():
    assert matches('3.61E+01', 36.1), 'sci notation'
    assert matches('‐1.17E+01', -11.7), 'unicode leading hyphen + sign'
    assert matches('1.11E‐01', 0.111), 'unicode exponent hyphen'
    assert matches('2,13E+02', 213), 'EU comma-decimal mantissa'
    assert matches('1,59E+01', 15.9), 'EU comma-decimal mantissa'
    assert matches('3,09E+02', 309) and not matches('3,09E+02', 310), 'tight tol separates 309/310 (EU)'
    assert not matches('3.10E+02', 309), 'tight tol separates 310/309'
    toks = [m.group() for m in TOKEN_RE.finditer('D ‐1.17E+01  bio 1.11E‐01  mass 2272  fossil 3,09E+02')]
    assert '‐1.17E+01' in toks and '1.11E‐01' in toks, 'captures signed + unicode-exponent tokens literally'
    assert '2272' in toks and '3,09E+02' in toks, 'captures plain + EU-comma sci'
    print('selftest: all passed'); return 0

if __name__ == '__main__':
    if '--selftest' in sys.argv: sys.exit(selftest())
    if '--bootstrap' in sys.argv: sys.exit(bootstrap())
    sys.exit(verify())
