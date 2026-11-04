#!/usr/bin/env python3
"""
Strip wireframe-review scaffolding from page fragments so the output reads
like a real site:

  * <… class="w-anno">…</…>            → removed entirely
  * <span class="w-sec-id">H1</span>   → removed (section ids kept for anchors)
  * eyebrows that only carried a section slug ("hero-slider · Glavni slider")
  * bracketed authoring notes: [PLACEHOLDER …], [CẦN …], [ĐỀ XUẤT …], [URL …]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PAGES = Path(__file__).resolve().parent / "_pages"

ANNO = re.compile(r"\s*<(\w+)[^>]*class=\"[^\"]*\bw-anno\b[^\"]*\"[^>]*>.*?</\1>", re.S)
ANNO_SELF = re.compile(r"\s*<(\w+)[^>]*class=\"[^\"]*\bw-anno\b[^\"]*\"[^>]*/>", re.S)
SECID = re.compile(r"<span class=\"w-sec-id\">[^<]*</span>\s*")
NOTE = re.compile(r"\s*\[(?:PLACEHOLDER|CẦN|ĐỀ XUẤT|URL|IME|DEMO|TODO|Khách|CHỜ)[^\[\]]*\]")
NOTE2 = re.compile(r"\s*\[[^\[\]]{0,120}?(?:PLACEHOLDER|placeholder|čeka potvrdu|nije potvrđen|demo iznos|izveden)[^\[\]]{0,120}?\]")
# empty card texts left by data without that field; empty elements that carry a data-* hook are filled by
# wireframe.js at runtime — keep them
EMPTY_ATTRLESS = re.compile(r"<p class=\"[^\"]*\bw-card-[\w-]+__(?:excerpt|text)\b[^\"]*\"(?![^>]*\bdata-)[^>]*>\s*</p>"
                            r"|<p>\s*</p>|<span class=\"w-card-[\w-]+__meta\">\s*</span>")
SLUG_EYEBROW = re.compile(
    r"\s*<(?:span|p) class=\"[^\"]*\bw-eyebrow\b[^\"]*\"[^>]*>\s*[a-z0-9]+(?:-[a-z0-9]+)+\s*(?:·|—|-)[^<]*</(?:span|p)>", re.S
)


def clean(text: str) -> str:
    prev = None
    while prev != text:
        prev = text
        text = ANNO.sub("", text)
    text = ANNO_SELF.sub("", text)
    text = SECID.sub("", text)
    text = SLUG_EYEBROW.sub("", text)
    text = NOTE2.sub("", text)
    text = NOTE.sub("", text)
    text = EMPTY_ATTRLESS.sub("", text)
    # collapse whitespace runs left behind
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text


def main() -> int:
    total = 0
    for f in sorted(PAGES.glob("*.html")):
        src = f.read_text(encoding="utf-8")
        out = clean(src)
        if out != src:
            f.write_text(out, encoding="utf-8")
            total += 1
            print(f"cleaned {f.name}")
    print(f"\n{total} fragment(s) cleaned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
