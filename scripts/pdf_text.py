#!/usr/bin/env python3
# pdf_text.py <pdf-path> [page]  — dump per-page text with 1-based PDF page index (via PyMuPDF).
# Used for EPD extraction: the page index printed here is what goes in source_page.
import sys, fitz

doc = fitz.open(sys.argv[1])
only = int(sys.argv[2]) if len(sys.argv) > 2 else None
for i, page in enumerate(doc, start=1):
    if only and i != only:
        continue
    print(f"\n===== PDF PAGE {i}/{len(doc)} =====")
    print(page.get_text())
