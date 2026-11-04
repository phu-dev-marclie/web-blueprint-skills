#!/usr/bin/env python3
"""
Design-tool handoff: built wireframe -> html-to-figma.

    python wireframe/build.py --final     # strip review-only <!--wf:review--> blocks first
    python wireframe/handoff.py           # writes wireframe/handoff/figma.json

Reads the built pages (wireframe/*.html), the design tokens of tokens.py (the Bricks Style Manager source, fluid
values evaluated at 1512 px desktop / 440 px mobile: brand + neutral primitives, theme roles as semantic colours,
spacing, radius, grid from the container tokens, type roles, shadows, gradients) and the stylesheets of
site.config.json -> css (section surfaces from [data-surface="x"] rules, @font-face):
  chrome   header/footer content from the data-chrome hooks of index.html
  pages    every built page + UI states (header menus, dialogs, tabs, wizard steps) + mobile screens
  layouts  data-layout of the top-level sections, per page (the section's block is w-<layout>)
  components  data-component roots (design-direction §8c) with their block class, data-prop ids,
           instance and page counts
  fonts    @font-face rules; icons: inline <svg class="w-icon pi-<name>">
Grid: the theme style's Container — --max-screen-width (border-box) minus 2 × --container-padding, split into
12 columns with --layout-gutter gaps; a column width that is not a whole pixel is reported as a warning and
exported floored, the remainder going to the side margins (html-to-figma needs columns + gutters + margins = page).
Then, in the html-to-figma skill:
    python <h2f>/scripts/init_project.py --project <project> --from-wireframe <project>/wireframe [--mobile]
Exits 1 with the list of problems when the build is not ready for handoff.
"""
from __future__ import annotations

import ast
import colorsys
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOKENS = ROOT / "handoff" / "bricks-tokens.json"   # written by tokens.py (tokens_builder); palettes "… · Theme" = roles
CONFIG = ROOT / "site.config.json"
OUT = ROOT / "handoff" / "figma.json"
DEFAULT_CSS = ["assets/tokens.css", "assets/base.css", "assets/components.css", "assets/sections.css"]
DESKTOP, MOBILE = 1512, 440
ICON_MATCH = r"(?:^|\s)pi-([\w-]+)"
WEIGHT_STYLE = {100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular", 500: "Medium",
                600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black"}
# CSS role (the component class that uses it) -> Figma text style, font role, weight token, letter-spacing token,
# extra, size token, line-height token (the size / line-height pair each role uses in the stylesheets; tokens from tokens.py)
TYPE_ROLES = [
    ("w-heading-2xl", "Display/XL", "heading", "font-weight-heading", "letter-spacing-display", {}, "text-6xl", "line-height-s"),
    ("h1", "Heading/H1", "heading", "font-weight-heading", "letter-spacing-heading", {}, "text-5xl", "line-height-s"),
    ("h2", "Heading/H2", "heading", "font-weight-heading", "letter-spacing-heading", {}, "text-4xl", "line-height-s"),
    ("h3", "Heading/H3", "heading", "font-weight-heading", "letter-spacing-heading", {}, "text-xl", "line-height-m"),
    ("h4", "Heading/H4", "heading", "font-weight-heading", "letter-spacing-heading", {}, "text-l", "line-height-xl"),
    ("h5", "Heading/H5", "heading", "font-weight-heading", "letter-spacing-heading", {}, "text-m", "line-height-xl"),
    ("h6", "Heading/H6", "heading", "font-weight-heading", "letter-spacing-heading", {}, "text-s", "line-height-l"),
    ("w-text-l", "Body/LG", "body", "font-weight-body", None, {}, "text-l", "line-height-xl"),
    ("body", "Body/MD", "body", "font-weight-body", None, {}, "text-m", "line-height-xl"),
    ("s", "Body/XS", "body", "font-weight-body", None, {}, "text-s", "line-height-l"),
    ("xs", "Body/Micro", "body", "font-weight-body", None, {}, "text-xs", "line-height-m"),
    ("title", "Title/MD", "heading", "font-weight-heading", None, {}, "text-m", "line-height-xl"),
    ("w-eyebrow", "Label/Eyebrow", "body", "font-weight-heading", "letter-spacing-eyebrow", {"textCase": "UPPER"}, "text-xs", "line-height-m"),
    ("nav", "Label/Nav", "body", "font-weight-strong", None, {}, "text-s", "line-height-l"),
    ("w-button-primary", "Label/Button LG", "body", "font-weight-strong", None, {}, "text-s", "line-height-l"),
    ("w-button-primary--small", "Label/Button SM", "body", "font-weight-strong", None, {}, "text-xs", "line-height-m"),
    ("field", "Label/Field", "body", "font-weight-strong", None, {}, "text-s", "line-height-l"),
    ("w-stat__value", "Stat/Number", "heading", "font-weight-heading", None, {}, "text-4xl", "line-height-s"),
]
WAIT = "await new Promise((r) => setTimeout(r, {ms}));"


class Problems:
    """Fatal problems, grouped by message -> files."""

    def __init__(self) -> None:
        self.items: dict[str, list[str]] = {}

    def add(self, msg: str, where: str = "") -> None:
        files = self.items.setdefault(msg, [])
        if where and where not in files:
            files.append(where)

    def __bool__(self) -> bool:
        return bool(self.items)

    def report(self) -> None:
        print(f"handoff: {len(self.items)} problem(s) — figma.json not written", file=sys.stderr)
        for msg, files in self.items.items():
            print(f"  - {msg}" + (f"  [{', '.join(files)}]" if files else ""), file=sys.stderr)


WARNINGS: list[str] = []


def num(x: float) -> int | float:
    r = round(x, 2)
    return int(r) if r == int(r) else r


# =============================================================== HTML (tiny DOM over html.parser)
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
AUTOCLOSE = {"li", "p", "option", "dt", "dd", "tr", "td", "th"}
WS = re.compile(r"[ \t\n\r\f\v]+")      # ASCII whitespace only: U+00A0 (no-break glue) survives


def norm(s: str) -> str:
    return WS.sub(" ", s).strip(" ")


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag: str, attrs: dict, parent: "Node | None") -> None:
        self.tag, self.attrs, self.children, self.parent = tag, attrs, [], parent

    def has(self, attr: str) -> bool:
        return attr in self.attrs

    def get(self, attr: str, default: str = "") -> str:
        return self.attrs.get(attr, default)

    @property
    def classes(self) -> list[str]:
        return self.get("class").split()

    def elements(self) -> list["Node"]:
        return [c for c in self.children if isinstance(c, Node)]

    def walk(self):
        """Descendants in document order (self excluded)."""
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()

    def find(self, pred) -> list["Node"]:
        return [n for n in self.walk() if pred(n)]

    def first(self, pred) -> "Node | None":
        return next((n for n in self.walk() if pred(n)), None)

    def closest(self, pred, stop: "Node | None" = None) -> "Node | None":
        n = self.parent
        while n is not None and n is not stop:
            if pred(n):
                return n
            n = n.parent
        return None

    def inside(self, other: "Node") -> bool:
        n = self
        while n is not None:
            if n is other:
                return True
            n = n.parent
        return False

    def raw_text(self, skip=None) -> str:
        out = []
        for c in self.children:
            if isinstance(c, str):
                out.append(c)
            elif c.tag in ("script", "style", "template", "svg") or (skip and skip(c)):
                continue
            else:
                out.append(c.raw_text(skip))
        return "".join(out)

    def text(self, skip=None) -> str:
        return norm(self.raw_text(skip))

    def label(self) -> str:
        return self.text() or norm(self.get("aria-label"))

    def describe(self) -> str:
        bits = [self.tag]
        if self.get("id"):
            bits.append("#" + self.get("id"))
        bits += ["." + c for c in self.classes[:2]]
        return "<" + "".join(bits) + ">"


class DOMBuilder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("#document", {}, None)
        self.cur = self.root

    def _node(self, tag: str, attrs) -> Node:
        if tag in AUTOCLOSE and self.cur.tag == tag:
            self.cur = self.cur.parent
        n = Node(tag, {k: (v if v is not None else "") for k, v in attrs}, self.cur)
        self.cur.children.append(n)
        return n

    def handle_starttag(self, tag, attrs):
        n = self._node(tag, attrs)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self._node(tag, attrs)

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


class Page:
    def __init__(self, path: Path) -> None:
        self.file = path.name
        self.raw = path.read_text(encoding="utf-8", errors="replace")
        b = DOMBuilder()
        b.feed(self.raw)
        b.close()
        self.doc = b.root
        self.body = self.doc.first(lambda n: n.tag == "body") or self.doc
        title = self.doc.first(lambda n: n.tag == "title")
        t = title.text() if title else ""
        t = t.replace("\u00a0", " ")          # frame names: plain spaces (no-break glue matters in rendered text only)
        self.name = "Home" if self.file == "index.html" else (re.split(r"\s+[—–|]\s+", t)[0].strip() or path.stem)
        self.nav = self.body.get("data-nav")
        kids = self.body.elements()
        self.header = next((n for n in kids if n.tag == "header"), None) or self.doc.first(lambda n: n.tag == "header")
        self.footer = next((n for n in kids if n.tag == "footer"), None) or self.doc.first(lambda n: n.tag == "footer")
        self.panel = self.doc.first(lambda n: n.has("data-nav-panel"))
        self.group = "Pages"

    def header_region(self, pred) -> list[Node]:
        """Header chrome: everything outside the footer and the mobile nav panel (utility bars may sit above <header>)."""
        return [n for n in self.doc.walk() if pred(n)
                and not (self.footer and n.inside(self.footer)) and not (self.panel and n.inside(self.panel))]

    def footer_region(self, pred) -> list[Node]:
        return self.footer.find(pred) if self.footer else []

    def sections(self) -> list[Node]:
        return [n for n in self.body.elements() if n.tag == "section" and n.has("data-layout")]


def chrome_of(key: str):
    return lambda n: n.get("data-chrome") == key


def in_menu_panel(n: Node, stop: Node | None = None) -> bool:
    return n.closest(lambda a: a.has("data-menu"), stop) is not None


# =============================================================== CSS
def scan(s: str, i: int, stops: str) -> int:
    """Index of the first char of `stops` at paren depth 0 outside strings (len(s) if none)."""
    depth, quote = 0, None
    while i < len(s):
        c = s[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == "(":
            depth += 1
        elif c == ")":
            depth = max(0, depth - 1)
        elif depth == 0 and c in stops:
            return i
        i += 1
    return len(s)


def match_close(s: str, i: int, open_: str, close: str) -> int:
    """s[i] == open_ -> index of the matching close (strings respected)."""
    depth, quote = 0, None
    while i < len(s):
        c = s[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == open_:
            depth += 1
        elif c == close:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return len(s)


def split_top(s: str, sep: str = ",") -> list[str]:
    parts, i = [], 0
    while True:
        j = scan(s, i, sep)
        parts.append(s[i:j].strip())
        if j >= len(s):
            return [p for p in parts if p]
        i = j + 1


def split_ws(s: str) -> list[str]:
    return split_top(re.sub(r"\s+", " ", s.strip()), " ")


def declarations(body: str) -> list[tuple[str, str, bool]]:
    out, i = [], 0
    while i < len(body):
        j = scan(body, i, ";{")
        if j < len(body) and body[j] == "{":          # nested rule (CSS nesting): skipped
            i = match_close(body, j, "{", "}") + 1
            continue
        decl = body[i:j].strip()
        i = j + 1
        if ":" not in decl:
            continue
        name, value = decl.split(":", 1)
        name = name.strip()
        if not name.startswith("--"):
            name = name.lower()
        value = value.strip()
        important = bool(re.search(r"!\s*important\s*$", value, re.I))
        if important:
            value = re.sub(r"\s*!\s*important\s*$", "", value, flags=re.I)
        out.append((name, value, important))
    return out


class Sheet:
    def __init__(self) -> None:
        self.rules: list[tuple[list[str], list[str], list]] = []   # (media conditions, selectors, declarations)
        self.faces: list[tuple[Path, list]] = []                    # (stylesheet, declarations)

    def parse(self, css: str, src: Path, conds: list[str] | None = None) -> None:
        conds = conds or []
        i = 0
        while i < len(css):
            j = scan(css, i, "{;}")
            if j >= len(css):
                break
            prelude = css[i:j].strip()
            if css[j] != "{":                       # @import/@charset statement or stray brace
                i = j + 1
                continue
            end = match_close(css, j, "{", "}")
            body = css[j + 1:end]
            i = end + 1
            if prelude.startswith("@"):
                m = re.match(r"@([\w-]+)\s*(.*)", prelude, re.S)
                name, rest = m.group(1).lower(), m.group(2).strip()
                if name == "media":
                    self.parse(body, src, conds + [rest])
                elif name in ("supports", "layer", "scope"):
                    self.parse(body, src, conds)
                elif name == "font-face":
                    self.faces.append((src, declarations(body)))
                # @keyframes, @page, @container, @font-feature-values …: no tokens
            else:
                self.rules.append((conds, split_top(prelude), declarations(body)))


def px_len(tok: str) -> float | None:
    m = re.fullmatch(r"(-?\d*\.?\d+)(px|rem|em)?", tok.strip())
    if not m:
        return None
    return float(m.group(1)) * (16 if m.group(2) in ("rem", "em") else 1)


def feature_ok(f: str, w: int) -> bool:
    f = re.sub(r"\s+", " ", f.strip())
    m = re.fullmatch(r"(min|max)-width ?: ?(\S+)", f)
    if m:
        v = px_len(m.group(2))
        return v is not None and (w >= v if m.group(1) == "min" else w <= v)
    if "width" in f and re.search(r"[<>]", f):        # range syntax: width <= 860px, 600px < width < 900px
        ops = {"<": lambda a, b: a < b, "<=": lambda a, b: a <= b, ">": lambda a, b: a > b, ">=": lambda a, b: a >= b}
        toks = re.findall(r"<=|>=|<|>|[^<>\s]+", f)
        vals = [w if t == "width" else (t if t in ops else px_len(t)) for t in toks]
        if None in vals:
            return False
        return all(ops[vals[k]](vals[k - 1], vals[k + 1]) for k in range(1, len(vals) - 1, 2))
    m = re.fullmatch(r"([\w-]+) ?: ?([\w-]+)", f)
    if m:
        feat, val = m.groups()
        known = {
            "prefers-reduced-motion": val == "no-preference",
            "prefers-color-scheme": val == "light",
            "prefers-contrast": val == "no-preference",
            "hover": (val == "hover") == (w == DESKTOP),
            "any-hover": (val == "hover") == (w == DESKTOP),
            "pointer": (val == "fine") == (w == DESKTOP),
            "any-pointer": (val == "fine") == (w == DESKTOP),
            "orientation": (val == "landscape") == (w == DESKTOP),
        }
        return known.get(feat, False)
    return False


def media_ok(query: str, w: int) -> bool:
    for q in split_top(query.lower()):
        neg = q.startswith("not ")
        q = re.sub(r"^(not|only)\s+", "", q)
        ok = True
        for m in re.finditer(r"\(([^()]*)\)|([a-z-]+)", q):
            if m.group(1) is not None:
                ok = ok and feature_ok(m.group(1), w)
            elif m.group(2) not in ("and", "screen", "all"):
                ok = False                            # print, speech, …
        if ok != neg:
            return True
    return False


SURFACE_SEL = re.compile(r"\[data-surface=([\"']?)([\w-]+)\1\]")


def applies(conds: list[str], w: int) -> bool:
    return all(media_ok(c, w) for c in conds)


def calc_px(value: str) -> float | None:
    """Resolved length (px/rem/em, calc() arithmetic) -> px."""
    v = value.strip().replace("calc", "")
    expr = re.sub(r"(\d*\.?\d+)(px|rem|em)?", lambda m: repr(float(m.group(1)) * (16 if m.group(2) in ("rem", "em") else 1)), v)
    if not expr or not re.fullmatch(r"[\d.eE\s+\-*/()]+", expr):
        return None
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return None
    allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.USub, ast.UAdd)
    if not all(isinstance(n, allowed) for n in ast.walk(tree)):
        return None
    try:
        return float(eval(compile(tree, "<calc>", "eval"), {"__builtins__": {}}))
    except ZeroDivisionError:
        return None


NAMED_COLORS = {"white": (255, 255, 255), "black": (0, 0, 0)}


def parse_color(v: str) -> tuple[str, float] | None:
    v = v.strip().lower()
    hx = lambda r, g, b: "#{:02X}{:02X}{:02X}".format(*(max(0, min(255, round(x))) for x in (r, g, b)))
    if v == "transparent":
        return "#000000", 0
    if v in NAMED_COLORS:
        return hx(*NAMED_COLORS[v]), 1
    m = re.fullmatch(r"#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})", v)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return "#" + h[:6].upper(), round(a, 3)
    m = re.fullmatch(r"(rgba?|hsla?)\((.*)\)", v, re.S)
    if not m:
        return None
    parts = [p for p in re.split(r"[\s,/]+", m.group(2).strip()) if p]
    if len(parts) not in (3, 4):
        return None

    def n(p: str, scale: float) -> float:
        return float(p[:-1]) * scale / 100 if p.endswith("%") else float(re.sub(r"deg$", "", p))

    try:
        a = n(parts[3], 1) if len(parts) == 4 else 1
        if m.group(1).startswith("rgb"):
            r, g, b = (n(p, 255) for p in parts[:3])
        else:
            h, s, li = n(parts[0], 360) / 360, n(parts[1], 100) / 100, n(parts[2], 100) / 100
            r, g, b = (x * 255 for x in colorsys.hls_to_rgb(h % 1, li, s))
    except ValueError:
        return None
    return hx(r, g, b), round(a, 3)


# =============================================================== tokens (from tokens.py)
FLUID = re.compile(r"clamp\(([\d.]+)rem, calc\((-?[\d.]+) \* \(100vw - ([\d.]+)rem\) \+ ([\d.]+)rem\), ([\d.]+)rem\)")


def length_at(value: str, width: int, html: float) -> float | None:
    """px of a token value at a viewport width: plain px, or Bricks' fluid clamp() in rem (1rem = html px)."""
    v = value.strip()
    if m := re.fullmatch(r"(-?\d*\.?\d+)px", v):
        return float(m.group(1))
    m = FLUID.fullmatch(v)
    if not m:
        return None
    h = html
    lo, slope, w0, base, hi = (float(x) for x in m.groups())
    val = slope * (width - w0 * h) + base * h
    return max(lo * h, min(val, hi * h))          # CSS clamp(): MIN wins when MIN > MAX


def prim_name(token: str) -> str:
    """primary → primary/base, primary-l-1 → primary/l-1, all-light-70 → all-light/70."""
    m = re.fullmatch(r"(.+?)-((?:[ld]-)?\d+)", token)
    return f"{m.group(1)}/{m.group(2)}" if m else f"{token}/base"


def role_name(token: str) -> str:
    """bg-body → bg/body, btn-bg-hover → btn/bg-hover, accent → accent/base."""
    return token.replace("-", "/", 1) if "-" in token else f"{token}/base"


def semantic_scope(name: str) -> str:
    group, rest = name.split("/", 1)
    if group in ("text", "hover"):
        return "text"
    if group in ("bg", "btn"):
        return "fill"
    if group in ("border", "focus"):
        return "stroke"
    if group in ("success", "error"):
        return "fill" if rest == "bg" else "text+stroke"
    return "fill+stroke"                               # accent, active


def single_var(value: str) -> str | None:
    m = re.fullmatch(r"var\(\s*(--[\w-]+)\s*(?:,.*)?\)", value.strip(), re.S)
    return m.group(1) if m else None


def style_name(prefix: str, key: str) -> str:
    return prefix + "/" + " ".join(p[:1].upper() + p[1:] for p in key.split("-") if p)


def parse_shadow(value: str) -> list[dict] | None:
    layers = []
    for layer in split_top(value):
        if layer == "none":
            continue
        inset, color, lens = False, ("#000000", 1), []
        for tok in split_ws(layer):
            if tok == "inset":
                inset = True
            elif (c := parse_color(tok)) is not None:
                color = c
            elif (p := calc_px(tok)) is not None:
                lens.append(p)
            else:
                return None
        if len(lens) < 2:
            return None
        lens += [0] * (4 - len(lens))
        d = {"x": num(lens[0]), "y": num(lens[1]), "blur": num(lens[2]), "spread": num(lens[3]),
             "color": color[0], "alpha": num(color[1]) if color[1] != 1 else 1}
        if inset:
            d["inset"] = True
        layers.append(d)
    return layers or None


SIDE_ANGLE = {"top": 0, "right": 90, "bottom": 180, "left": 270, "top right": 45, "right top": 45,
              "bottom right": 135, "right bottom": 135, "bottom left": 225, "left bottom": 225,
              "top left": 315, "left top": 315}


def parse_gradient(value: str) -> dict | None:
    m = re.fullmatch(r"linear-gradient\((.*)\)", value.strip(), re.S)
    if not m:
        return None
    args = split_top(m.group(1))
    angle = 180.0
    first = args[0].strip().lower()
    am = re.fullmatch(r"(-?\d*\.?\d+)(deg|turn|rad|grad)", first)
    if am:
        k = {"deg": 1, "turn": 360, "rad": 57.29577951308232, "grad": 0.9}[am.group(2)]
        angle, args = float(am.group(1)) * k, args[1:]
    elif first.startswith("to "):
        if first[3:].strip() not in SIDE_ANGLE:
            return None
        angle, args = SIDE_ANGLE[first[3:].strip()], args[1:]
    stops: list[list] = []
    for a in args:
        toks = split_ws(a)
        c = parse_color(toks[0]) if toks else None
        if c is None:
            return None
        poss = [float(t[:-1]) / 100 for t in toks[1:] if re.fullmatch(r"-?\d*\.?\d+%", t)]
        for p in poss or [None]:
            stops.append([c[0], p, c[1]])
    if len(stops) < 2:
        return None
    if stops[0][1] is None:
        stops[0][1] = 0.0
    if stops[-1][1] is None:
        stops[-1][1] = 1.0
    k = 0
    while k < len(stops):                       # spread unpositioned stops evenly between their neighbours
        if stops[k][1] is None:
            j = k
            while stops[j][1] is None:
                j += 1
            a, b = stops[k - 1][1], stops[j][1]
            for t in range(k, j):
                stops[t][1] = a + (b - a) * (t - k + 1) / (j - k + 1)
            k = j
        k += 1
    out = [[h, num(p)] + ([num(al)] if al != 1 else []) for h, p, al in stops]
    return {"angle": num(angle % 360), "stops": out}


def first_family(stack: str) -> str:
    fams = split_top(stack)
    return fams[0].strip().strip("'\"") if fams else ""


def build_tokens(sheet: Sheet, problems: Problems) -> dict:
    """Figma tokens from tokens.py (light mode; fluid values at DESKTOP / MOBILE) + surfaces from the stylesheets."""
    if not TOKENS.is_file():
        problems.add(f"{TOKENS.relative_to(ROOT)} missing — run python tokens.py")
        return {"fonts": {}, "primitives": {}, "alpha": {}, "semantic": [], "space": [], "radius": {}, "grid": {},
                "gridMobile": {}, "type": [], "surfaces": {}, "darkSurfaces": [], "section": {"padY": 64},
                "effects": {}, "gradients": {}}
    data = json.loads(TOKENS.read_text(encoding="utf-8"))
    colours = {c["name"]: c["light"] for p in data["palettes"] for c in p["colors"]}
    variables = {v["name"]: v["value"] for v in data["variables"]}
    roles = [c["name"] for p in data["palettes"] if p["name"].endswith("Theme") for c in p["colors"]]
    hs = str(data["styleManager"].get("htmlFontSize", "16px")).strip().lower()   # px | rem | % of the 16 px browser base
    html = float(re.sub(r"[^\d.]", "", hs)) * {"%": 0.16, "rem": 16.0}.get(re.sub(r"[\d.]", "", hs), 1.0)

    def var_value(name: str) -> str:
        v = variables.get(name, "")
        while (ref := single_var(v)) is not None and ref[2:] in variables:
            v = variables[ref[2:]]
        return v

    def px(name: str, width: int = DESKTOP) -> float | None:
        p = length_at(var_value(name), width, html)
        if p is None:
            problems.add(f"--{name} is not a px / fluid length in tokens.py")
        return p

    # colours: brand + neutral palettes are primitives; theme roles are the semantic layer
    primitives, alpha = {}, {}

    def add_primitive(fig: str, value: str) -> bool:
        c = parse_color(value)
        if c is None:
            return False
        if c[1] < 1:
            alpha[fig] = [c[0], num(c[1])]
        else:
            primitives[fig] = c[0]
        return True

    for name, value in colours.items():
        if name not in roles and not add_primitive(prim_name(name), value):
            problems.add(f"--{name}: colour {value} is not hex / rgb()")
    semantic = []
    for name in roles:
        fig, value = role_name(name), colours[name]
        ref = single_var(value)
        if ref is not None:
            target = ref[2:]
            if target in roles or target not in colours:
                problems.add(f"theme role --{name} must point at a brand / neutral colour, not {value}")
                continue
            semantic.append([fig, prim_name(target), semantic_scope(fig)])
        elif add_primitive(f"role/{name}", value):
            semantic.append([fig, f"role/{name}", semantic_scope(fig)])
        else:
            problems.add(f"theme role --{name}: colour {value} is not hex / rgb()")
    sem_names = {s[0] for s in semantic}

    # spacing, radius, grid
    space = sorted({num(p) for n in variables if n.startswith("space-") and (p := px(n)) is not None})
    radius = {n[len("radius-"):]: num(min(p, 999)) for n in variables if n.startswith("radius-") and (p := px(n)) is not None}
    # grid: the Container theme style — width --max-screen-width (border-box), side padding --container-padding;
    # 12 columns with --layout-gutter gaps inside it, centred in the DESKTOP frame
    screen, pad, gutter = px("max-screen-width"), px("container-padding"), px("layout-gutter")
    grid = {}
    if None not in (screen, pad, gutter):
        container = min(screen, DESKTOP)
        column = (container - 2 * pad - 11 * gutter) / 12
        whole = int(column)
        if abs(column - round(column)) > 1e-6:
            WARNINGS.append(f"grid column (--max-screen-width {num(container)} − 2 × --container-padding {num(pad)} − 11 × "
                            f"--layout-gutter {num(gutter)}) / 12 = {column:.2f} px is not a whole pixel — exported as "
                            f"{whole} px with wider margins; pick token values that divide evenly")
        else:
            whole = round(column)
        grid = {"page": DESKTOP, "columns": 12, "column": whole, "gutter": num(gutter),
                "margin": num((DESKTOP - 12 * whole - 11 * gutter) / 2)}
    grid_mobile = {"page": MOBILE, "columns": 4, "gutter": num(px("layout-gutter", MOBILE) or 16),
                   "margin": num(px("container-padding", MOBILE) or 16)}

    # fonts and type
    fonts = {"heading": first_family(var_value("font-family-display")) or "Inter",
             "body": first_family(var_value("font-family")) or "Inter"}

    def weight(name: str) -> str:
        try:
            w = int(round(float(var_value(name)) / 100) * 100)
        except ValueError:
            w = 400
        return WEIGHT_STYLE.get(min(900, max(100, w)), "Regular")

    def tracking(name: str | None) -> int | float:
        v = var_value(name).strip().lower() if name else ""
        return num(float(v[:-2]) * 100) if v.endswith("em") else 0

    type_ = []
    for role, style, font, wvar, lsvar, extra, size_tok, lh_tok in TYPE_ROLES:
        size, ratio = px(size_tok), float(var_value(lh_tok) or 0)
        if size is None or not ratio:
            problems.add(f"type role {role}: --{size_tok} / --{lh_tok} missing in tokens.py")
            continue
        entry = [style, font, weight(wvar), num(size), num(size * ratio), tracking(lsvar)]
        ex = dict(extra)
        ms = px(size_tok, MOBILE)
        if ms is not None and num(ms) != num(size):
            ex["mobile"] = [num(ms), num(ms * ratio)]
        if ex:
            entry.append(ex)
        type_.append(entry)

    # effects, gradients
    effects, gradients = {}, {}
    for n, v in variables.items():
        m = re.fullmatch(r"(shadow|gradient)-([\w-]+)", n)
        if not m:
            continue
        if m.group(1) == "shadow":
            layers = parse_shadow(v)
            if layers:
                effects[style_name("Shadow", m.group(2))] = layers
            else:
                WARNINGS.append(f"--{n}: cannot read box-shadow “{v}” — not exported")
        else:
            g = parse_gradient(v)
            if g:
                gradients[style_name("Gradient", m.group(2))] = g
            else:
                WARNINGS.append(f"--{n}: only linear-gradient(<angle>, <colour> <pos>%, …) is exported — skipped “{v}”")

    # surfaces: [data-surface="x"] { background: var(--bg-…); color: var(--text-contrast) }
    surfaces, dark = {}, {}
    for conds, sels, decls in sheet.rules:
        if len(sels) != 1 or not applies(conds, DESKTOP):
            continue
        m = SURFACE_SEL.fullmatch(sels[0])
        if not m:
            continue
        key = m.group(2)
        for name, value, _ in decls:
            if name in ("background", "background-color"):
                bm = re.match(r"var\(\s*--(bg-[\w-]+)", value.strip())
                if bm:
                    surfaces[key] = role_name(bm.group(1))
            elif name == "color":
                dark[key] = single_var(value) == "--text-contrast"
    for key, token in surfaces.items():
        if token not in sem_names:
            WARNINGS.append(f'[data-surface="{key}"] uses {token}, which is not a theme colour role')

    pad = px("layout-section-pad")
    return {
        "fonts": fonts, "primitives": primitives, "alpha": alpha, "semantic": semantic, "space": space,
        "radius": radius, "grid": grid, "gridMobile": grid_mobile, "type": type_,
        "surfaces": surfaces, "darkSurfaces": [k for k in surfaces if dark.get(k)],
        "section": {"padY": num(pad) if pad is not None else 64}, "effects": effects, "gradients": gradients,
    }


def font_faces(sheet: Sheet) -> list[dict]:
    fams: dict[str, dict] = {}
    for src, decls in sheet.faces:
        d = {n: v for n, v, _ in decls}
        family = first_family(d.get("font-family", ""))
        if not family:
            continue
        f = fams.setdefault(family, {"family": family, "weights": [], "files": []})
        for w in (d.get("font-weight") or "400").split():
            w = {"normal": "400", "bold": "700"}.get(w.lower(), w)
            if w.isdigit() and int(w) not in f["weights"]:
                f["weights"].append(int(w))
        for url in re.findall(r"url\(\s*(['\"]?)(.*?)\1\s*\)", d.get("src", "")):
            u = url[1]
            if re.match(r"^(data:|[a-z]+://|//)", u):
                rel = u if not u.startswith("data:") else None
            else:
                p = (src.parent / u.split("?")[0].split("#")[0]).resolve()
                rel = os.path.relpath(p, ROOT).replace("\\", "/")
            if rel and rel not in f["files"]:
                f["files"].append(rel)
    for f in fams.values():
        f["weights"].sort()
    return list(fams.values())


# =============================================================== pages, chrome, states
def page_group(index: Page, key: str) -> str:
    if not key:
        return "Pages"
    el = next(iter(index.header_region(lambda n: n.tag != "body" and n.get("data-nav") == key)), None)
    if el is None:
        return "Pages"
    panel = el.closest(lambda a: a.has("data-menu"))
    if panel is not None:
        pid = panel.get("id")
        toggle = next(iter(index.header_region(lambda n: n.has("data-menu-toggle") and pid and n.get("aria-controls") == pid)), None)
        if toggle is not None and toggle.label():
            return toggle.label()
    if el.tag == "a" or el.has("data-menu-toggle"):
        return el.label() or "Pages"
    inner = el.first(lambda n: (n.has("data-menu-toggle") or n.tag == "a") and not in_menu_panel(n, el))
    return (inner.label() if inner else el.label()) or "Pages"


def nav_order(index: Page) -> list[str]:
    keys: list[str] = []
    for n in index.header_region(lambda n: n.tag != "body" and n.get("data-nav")):
        if n.get("data-nav") not in keys:
            keys.append(n.get("data-nav"))
    return keys


def chrome(index: Page) -> tuple[dict, str]:
    one = lambda nodes: nodes[0] if nodes else None
    brand = one(index.header_region(chrome_of("brand")))
    name = ""
    if brand is not None:
        name = re.split(r"\s+[—–]\s+", norm(brand.get("aria-label")) or brand.text())[0].strip()
    cta_el = one(index.header_region(chrome_of("cta")))
    is_cta = lambda n: n.get("data-chrome") == "cta" or n.first(chrome_of("cta")) is not None
    nav = []
    nav_el = one(index.header_region(chrome_of("nav")))
    if nav_el is not None:
        for n in nav_el.walk():
            if n.tag != "a" and not n.has("data-menu-toggle"):
                continue
            if in_menu_panel(n, nav_el) or is_cta(n) or n.closest(lambda a: a.tag == "a" or a.has("data-menu-toggle"), nav_el):
                continue
            if n.label():
                nav.append({"label": n.label(), "menu": n.has("data-menu-toggle")})
    utility = []
    for u in index.header_region(chrome_of("utility")):
        for n in u.walk():
            if n.tag in ("a", "button") and not in_menu_panel(n, u) and not is_cta(n) and n.label() \
                    and not n.closest(lambda a: a.tag in ("a", "button"), u):
                utility.append(n.label())
    f_one = lambda key: one(index.footer_region(chrome_of(key)))
    tagline = f_one("tagline")
    contact = []
    c = f_one("contact")
    if c is not None:
        kids = [k for k in c.elements() if k.tag != "br"]
        if any(k.tag == "br" for k in c.elements()) or not kids:
            parts, buf = [], []
            for ch in c.children:
                if isinstance(ch, Node) and ch.tag == "br":
                    parts.append("".join(buf))
                    buf = []
                else:
                    buf.append(ch if isinstance(ch, str) else ch.raw_text())
            parts.append("".join(buf))
            contact = [norm(p) for p in parts if norm(p)]
        else:
            contact = [k.text() for k in kids if k.text()]
    columns = []
    for col in index.footer_region(chrome_of("footer-col")):
        title = col.first(lambda n: n.tag in ("h2", "h3", "h4", "h5", "h6", "p", "strong"))
        links = [a.text() for a in col.find(lambda n: n.tag == "a") if not (title and a.inside(title)) and a.text()]
        columns.append({"title": title.text() if title else "", "links": links})
    legal_el, legal_links_el = f_one("legal"), f_one("legal-links")
    legal = legal_el.text(skip=lambda n: n.get("data-chrome") == "legal-links") if legal_el is not None else ""
    legal_links = [a.text() for a in legal_links_el.find(lambda n: n.tag == "a") if a.text()] if legal_links_el is not None else []
    return {
        "utility": utility, "nav": nav, "cta": cta_el.label() if cta_el is not None else "",
        "footer": {"tagline": tagline.text() if tagline is not None else "", "contact": contact, "columns": columns,
                   "legal": legal, "legalLinks": legal_links},
    }, name


def validate(page: Page, problems: Problems) -> None:
    f = page.file
    if page.doc.first(lambda n: "wf-bar" in n.classes) is not None or "<!--wf:review-->" in page.raw:
        problems.add("review bar / review blocks in the build — delete any wf-bar from the header partial "
                     "and run `python wireframe/build.py --final`", f)
    if page.header is None:
        problems.add("no <header> element", f)
    elif not page.header_region(chrome_of("nav")):
        problems.add('header has no [data-chrome="nav"] (main navigation container)', f)
    if page.footer is None:
        problems.add("no <footer> element", f)
    elif not page.footer_region(chrome_of("footer-col")):
        problems.add('footer has no [data-chrome="footer-col"] (footer link column)', f)
    kids = page.body.elements()
    if page.header in kids and page.footer in kids:
        for n in kids[kids.index(page.header) + 1:kids.index(page.footer)]:
            if n.tag in ("script", "style", "template", "noscript", "link") or n.has("data-nav-panel") or n.tag == "dialog":
                continue
            if n.tag == "section" and n.get("data-layout") and n.get("data-surface"):
                continue
            problems.add(f"top-level {n.describe()} between header and footer — every top-level element must be "
                         f'<section data-layout="…" data-surface="…"> or <dialog>', f)


def js(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def dialog_title(page: Page, d: Node) -> str:
    for ref in d.get("aria-labelledby").split():
        el = page.doc.first(lambda n: n.get("id") == ref)
        if el is not None and el.text():
            return el.text()
    h = d.first(lambda n: n.tag in ("h1", "h2", "h3", "h4", "h5", "h6"))
    return norm(d.get("aria-label")) or (h.text() if h else "") or d.get("id")


def page_states(page: Page, index_page: bool, shared_ids: set[str]) -> list[dict]:
    states = []

    def add(label: str, prepare: list[str]) -> None:
        states.append({"group": page.group, "name": f"{page.name} · {label}".replace("\u00a0", " "), "file": page.file,
                       "prepare": "\n".join(prepare)})

    if index_page:
        for t in page.header_region(lambda n: n.has("data-menu-toggle") and n.get("aria-controls")):
            sel = f"[data-menu-toggle][aria-controls='{t.get('aria-controls')}']"
            add(f"Menu {t.label() or t.get('aria-controls')}",
                [f"document.querySelector({js(sel)}).click();", WAIT.format(ms=300)])
    kids = page.body.elements()
    content = kids[kids.index(page.header) + 1:kids.index(page.footer)] if page.header in kids and page.footer in kids else []
    for d in page.doc.find(lambda n: n.tag == "dialog" and n.has("data-dialog") and n.get("id")):
        # page dialogs on their page; shared dialogs (header/footer partials: outside the content, or on every page)
        # once, on index.html
        shared = d.get("id") in shared_ids or not any(d.inside(c) for c in content)
        if shared and not index_page:
            continue
        did = d.get("id")
        opener = f"[data-dialog-open='{did}']"
        add(dialog_title(page, d), [
            f"const o = [...document.querySelectorAll({js(opener)})].find((e) => e.getClientRects().length);",
            f"if (o) o.click(); else document.getElementById({js(did)}).showModal();",
            WAIT.format(ms=400)])
    for i, tabs in enumerate(page.doc.find(lambda n: n.has("data-tabs"))):
        for k, a in enumerate(tabs.find(lambda n: n.tag == "a")):
            if k:
                add(a.label() or f"Tab {k + 1}",
                    [f'document.querySelectorAll("[data-tabs]")[{i}].querySelectorAll("a")[{k}].click();', WAIT.format(ms=200)])
    for i, form in enumerate(page.doc.find(lambda n: n.tag == "form" and n.has("data-wizard"))):
        steps = len(form.find(lambda n: n.has("data-wizard-panel")))
        marks = form.find(lambda n: n.has("data-wizard-step"))
        for k in range(1, steps):
            add((marks[k].text() if k < len(marks) else "") or f"Step {k + 1}", [
                f'const f = document.querySelectorAll("form[data-wizard]")[{i}];',
                'for (const e of f.querySelectorAll("[required], [pattern], [min], [max], [minlength]")) '
                'for (const a of ["required", "pattern", "min", "max", "minlength"]) e.removeAttribute(a);',
                f"for (let k = 0; k < {k}; k++) {{",
                '  f.querySelector("[data-wizard-next]").click();',
                "  " + WAIT.format(ms=150),
                "}"])
    return states


def mobile_screens(pages: list[Page]) -> list[dict]:
    out = []
    index = pages[0]
    out.append({"group": index.group, "name": index.name, "file": index.file, "device": "mobile"})
    if index.doc.first(lambda n: n.has("data-nav-toggle")) is not None:
        out.append({"group": index.group, "name": f"{index.name} · Menu", "file": index.file, "device": "mobile",
                    "prepare": "\n".join(['document.querySelector("[data-nav-toggle]").click();', WAIT.format(ms=300)])})
    for p in pages:
        if p.doc.first(lambda n: n.has("data-filter-panel")) is not None:
            out.append({"group": p.group, "name": f"{p.name} · Filters", "file": p.file, "device": "mobile", "prepare": "\n".join([
                'const t = [...document.querySelectorAll("[data-filter-open]")].find((e) => e.getClientRects().length)'
                ' || document.querySelector("[data-filter-open]");',
                "t.click();", WAIT.format(ms=400)])})
    return out


# =============================================================== main
def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    problems = Problems()
    files = sorted(ROOT.glob("*.html"), key=lambda p: (p.name != "index.html", p.name))
    if not files:
        problems.add(f"no built pages (*.html) in {ROOT} — run `python wireframe/build.py --final`")
        problems.report()
        return 1
    pages = [Page(f) for f in files]
    if pages[0].file != "index.html":
        problems.add("no index.html — the header/footer chrome and the home screens are read from it")

    cfg = json.loads(CONFIG.read_text(encoding="utf-8")) if CONFIG.is_file() else {}
    sheet = Sheet()
    for rel in cfg.get("css", DEFAULT_CSS):
        p = ROOT / rel
        if not p.is_file():
            problems.add(f"stylesheet {rel} (site.config.json → css) does not exist")
            continue
        sheet.parse(re.sub(r"/\*.*?\*/", "", p.read_text(encoding="utf-8", errors="replace"), flags=re.S), p)

    for p in pages:
        validate(p, problems)
    index = pages[0]
    for p in pages:
        p.group = page_group(index, p.nav).replace("\u00a0", " ")
    order = nav_order(index)
    # index first, then header nav order; inside a group the authored hub before generated family pages
    generated = {f.name for f in files if "<!-- wf:generated" in f.read_text(encoding="utf-8", errors="replace")}
    rank = lambda p: (p.file != "index.html", order.index(p.nav) if p.nav in order else len(order),
                      p.file in generated, p.file)
    pages.sort(key=rank)

    tokens = build_tokens(sheet, problems)
    chrome_data, brand = chrome(index)

    dialog_ids = [{n.get("id") for n in p.doc.find(lambda n: n.tag == "dialog" and n.has("data-dialog") and n.get("id"))}
                  for p in pages]
    shared_ids = set.intersection(*dialog_ids) if len(pages) > 1 else set()
    states = []
    for p in pages:
        states += page_states(p, p is index, shared_ids)
    layouts: dict[str, list[str]] = {}
    used_surfaces = set()
    for p in pages:
        for s in p.sections():
            files_of = layouts.setdefault(s.get("data-layout"), [])
            if p.file not in files_of:
                files_of.append(p.file)
            used_surfaces.add(s.get("data-surface") or "default")
    for s in sorted(used_surfaces - set(tokens["surfaces"])):
        WARNINGS.append(f'data-surface="{s}" is used but no [data-surface="{s}"] {{ background: var(--bg-…) }} rule defines it')

    # components: data-component roots (design-direction §8c) + their data-prop ids, for Bricks/Figma
    components: dict[str, dict] = {}
    for p in pages:
        for root in p.doc.find(lambda n: n.has("data-component")):
            c = components.setdefault(root.get("data-component"), {
                "block": root.classes[0] if root.classes else "", "classes": root.classes,
                "props": [], "instances": 0, "pages": []})
            c["instances"] += 1
            if p.file not in c["pages"]:
                c["pages"].append(p.file)
            owned = [root] if root.has("data-prop") else []
            owned += root.find(lambda n: n.has("data-prop") and n.closest(lambda a: a.has("data-component")) is root)
            for n in owned:
                if n.get("data-prop") not in c["props"]:
                    c["props"].append(n.get("data-prop"))
    for name, c in components.items():
        c["pageCount"] = len(c["pages"])
        if not c["props"]:
            WARNINGS.append(f'data-component="{name}" has no data-prop — nothing varies per instance?')

    icon_files, icon_keys = [], []
    for p in pages:
        found = False
        for svg in p.doc.find(lambda n: n.tag == "svg" and "w-icon" in n.classes):
            for m in re.finditer(ICON_MATCH, svg.get("class")):
                found = True
                if m.group(1) not in icon_keys:
                    icon_keys.append(m.group(1))
        if found:
            icon_files.append(p.file)

    if problems:
        problems.report()
        return 1

    data = {
        "generator": "ux-wireframe handoff.py",
        "name": brand or ROOT.parent.name,
        "siteDir": ROOT.as_posix(),
        "sections": {"selector": "body > section[data-layout]", "layout": "sec.dataset.layout",
                     "surface": "sec.dataset.surface || 'default'"},
        "pages": [{"group": p.group, "name": p.name, "file": p.file} for p in pages],
        "states": states,
        "mobile": mobile_screens(pages),
        "layouts": layouts,
        "components": components,
        "chrome": chrome_data,
        "tokens": tokens,
        "fonts": font_faces(sheet),
        "icons": {"files": icon_files, "match": ICON_MATCH, "keys": sorted(icon_keys)},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    t = tokens
    print(f"wrote {OUT}")
    print(f"  {data['name']}: {len(data['pages'])} pages, {len(states)} states, {len(data['mobile'])} mobile screens, "
          f"{len(layouts)} layouts, {len(components)} components")
    print(f"  tokens: {len(t['primitives'])} primitives + {len(t['alpha'])} alpha, {len(t['semantic'])} semantic, "
          f"{len(t['type'])} text styles, {len(t['space'])} spaces, {len(t['effects'])} effects, {len(t['gradients'])} gradients, "
          f"surfaces {', '.join(t['surfaces'])}")
    print(f"  grid: {t['grid']}  mobile: margin {t['gridMobile']['margin']}, gutter {t['gridMobile']['gutter']}")
    fonts = ", ".join(f"{f['family']} {'/'.join(map(str, f['weights']))}" for f in data["fonts"])
    print(f"  fonts: heading {t['fonts']['heading']}, body {t['fonts']['body']}" + (f"; @font-face: {fonts}" if fonts else ""))
    print(f"  icons ({len(icon_keys)}): {', '.join(sorted(icon_keys)) or '—'}")
    for w in WARNINGS:
        print(f"  warning: {w}")
    print("next (html-to-figma): python <h2f>/scripts/init_project.py --project <project> --from-wireframe "
          f"\"{ROOT}\" [--mobile]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
