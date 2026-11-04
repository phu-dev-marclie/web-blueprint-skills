#!/usr/bin/env python3
"""
Render data-driven page fragments: one template × one data file → many _pages/<slug>.html.

Use it for page families that share a composition (product pages, locations, team members…)
so every linked page is a real page without hand-writing each one.

Input : wireframe/data/*.json
        { "template": "_templates/product.html",
          "meta": { "template": "T:pdp", "nav": "products" },      # defaults for every page
          "pages": [ { "slug": "x", "title": "…", "desc": "…", …fields… } ],
          "index": { "render": "_templates/products-index.html",    # optional: the family's
                     "slug": "products", "title": "…", "desc": "…",  # listing page, rendered
                     "template": "T:blog-index", "nav": "…", …fields… },  # from the same data
          "also": [ { "render": "_templates/book.html",                # optional: one more page
                      "slug": "book-{slug}", "title": "Book {name} | …",   # per record (booking,
                      "desc": "…", "template": "T:funnel", "nav": "" } ] } # print, reviews…)
        wireframe/_templates/<name>.html   body fragment WITHOUT the META line
Output: wireframe/_pages/<slug>.html       META line + marker comment + rendered body
        The index template sees its own fields plus {{#each pages}} (every page record), so a
        blog index, team index or location list never copies the cards' data by hand.
        "also" renders each record a second time with another template; {field} in slug/title/desc
        is filled from the record, so a stay and its booking page share one data source. Optional
        "when": "<field>" renders the extra page only for records where that field is truthy (a
        thank-you page only for stays that can be booked).

Template syntax (mustache-like, minimal):
  {{field}}            HTML-escaped value; dotted paths allowed (a.b)
  {{&field}}           raw value
  {{#each list}}…{{/each}}   loop; inside: item fields, {{.}} for scalars,
                       {{@n}} 1-based index, {{@nn}} zero-padded index, {{@last}} truthy on last
  {{#if field}}…{{else}}…{{/if}}   truthy = non-empty string/list/dict, non-zero number, true
  {{#unless field}}…{{/unless}}
Lookups walk outwards from the current loop item to the page record.

Generated fragments are overwritten on every run: edit the data or the template, never the output.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
PAGES = ROOT / "_pages"
MARK = "<!-- wf:generated {src} — edit the data file or template, not this fragment -->"

TOKEN = re.compile(r"\{\{\s*([#/&]?)\s*([^}]*?)\s*\}\}")


class Missing(Exception):
    pass


def parse(src: str):
    """Tokens → nested tree of ('text', s) | ('var', name, raw) | ('block', kind, name, body, else_body)."""
    root: list = []
    stack: list[tuple[list, tuple | None]] = [(root, None)]
    pos = 0
    for m in TOKEN.finditer(src):
        if m.start() > pos:
            stack[-1][0].append(("text", src[pos:m.start()]))
        sigil, body = m.group(1), m.group(2)
        pos = m.end()
        if sigil == "#":
            kind, _, name = body.partition(" ")
            node = ["block", kind, name.strip(), [], None]
            stack[-1][0].append(node)
            stack.append((node[3], node))
        elif sigil == "/":
            if len(stack) == 1:
                raise SyntaxError(f"unexpected {{{{/{body}}}}}")
            stack.pop()
        elif body == "else":
            node = stack[-1][1]
            if not node:
                raise SyntaxError("{{else}} outside a block")
            node[4] = []
            stack[-1] = (node[4], node)
        else:
            stack[-1][0].append(("var", body, sigil == "&"))
    if len(stack) != 1:
        raise SyntaxError(f"unclosed block {stack[-1][1][1]} {stack[-1][1][2]}")
    if pos < len(src):
        root.append(("text", src[pos:]))
    return root


def lookup(scopes: list, name: str):
    if name == ".":
        return scopes[-1]
    for scope in reversed(scopes):
        cur, ok = scope, True
        for part in name.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            elif isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
                cur = cur[int(part)]
            else:
                ok = False
                break
        if ok:
            return cur
    raise Missing(name)


def truthy(v) -> bool:
    return bool(v) and v != "0"


def render(tree, scopes: list) -> str:
    out = []
    for node in tree:
        if node[0] == "text":
            out.append(node[1])
        elif node[0] == "var":
            v = lookup(scopes, node[1])
            s = "" if v is None else (v if isinstance(v, str) else str(v))
            out.append(s if node[2] else html.escape(s, quote=True))
        else:
            _, kind, name, body, else_body = node
            v = lookup(scopes, name)
            if kind == "each":
                items = v or []
                for i, item in enumerate(items):
                    loop = {"@n": i + 1, "@nn": f"{i + 1:02d}", "@last": i == len(items) - 1}
                    out.append(render(body, scopes + [loop, item]))
                if not items and else_body:
                    out.append(render(else_body, scopes))
            elif kind in ("if", "unless"):
                cond = truthy(v) if kind == "if" else not truthy(v)
                out.append(render(body if cond else (else_body or []), scopes))
            else:
                raise SyntaxError(f"unknown block #{kind}")
    return "".join(out)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    files = sorted(DATA.glob("*.json")) if DATA.is_dir() else []
    if not files:
        print("no data files in wireframe/data/ — nothing to render")
        return 0
    total = 0
    for f in files:
        spec = json.loads(f.read_text(encoding="utf-8"))
        tpl_path = ROOT / spec["template"]
        tree = parse(tpl_path.read_text(encoding="utf-8"))
        defaults = spec.get("meta", {})
        jobs = [(tree, spec["template"], page, [page]) for page in spec["pages"]]
        for extra in spec.get("also", []):
            if not extra.get("render") or "{" not in extra.get("slug", ""):
                print(f"error: {f.name}: 'also' needs 'render' and a slug pattern like \"book-{{slug}}\"", file=sys.stderr)
                return 1
            etree = parse((ROOT / extra["render"]).read_text(encoding="utf-8"))
            for page in spec["pages"]:
                if extra.get("when") and not truthy(page.get(extra["when"])):
                    continue
                sub = lambda s, p=page: re.sub(r"\{(\w+)\}", lambda m: str(p.get(m.group(1), m.group(0))), s)
                rec = dict(page, **{k: sub(v) if isinstance(v, str) else v for k, v in extra.items() if k not in ("render", "when")})
                rec["record_slug"] = page["slug"]
                jobs.append((etree, extra["render"], rec, [rec]))
        index = spec.get("index")
        if index:
            if not index.get("render"):
                print(f"error: {f.name}: 'index' without 'render' (its template path)", file=sys.stderr)
                return 1
            jobs.append((parse((ROOT / index["render"]).read_text(encoding="utf-8")), index["render"],
                         index, [{"pages": spec["pages"]}, index]))
        for tree_, tpl_name, page, scopes in jobs:
            for key in ("slug", "title"):
                if not page.get(key):
                    print(f"error: {f.name}: page without '{key}': {page.get('slug')}", file=sys.stderr)
                    return 1
            try:
                body = render(tree_, scopes)
            except Missing as e:
                print(f"error: {f.name}: page '{page['slug']}' has no field '{e}' used by {tpl_name}",
                      file=sys.stderr)
                return 1
            meta = {"title": page["title"], "desc": page.get("desc", ""),
                    "template": page.get("template", defaults.get("template", "")),
                    "nav": page.get("nav", defaults.get("nav", ""))}
            out = ("<!--META " + json.dumps(meta, ensure_ascii=False) + " -->\n"
                   + MARK.format(src=f"{f.name} × {tpl_name}") + "\n" + body.strip() + "\n")
            (PAGES / f"{page['slug']}.html").write_text(out, encoding="utf-8")
            total += 1
        print(f"rendered {len(jobs)} page(s) from {f.name}" + (" (incl. index)" if index else ""))
    print(f"\n{total} generated fragment(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
