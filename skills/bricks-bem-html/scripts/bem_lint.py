#!/usr/bin/env python3
"""BEM lint for HTML/CSS that is meant to become native, editable Bricks Builder data.

Every rule maps to something a developer feels inside Bricks: an element without a class
cannot be styled from the builder; a rule like `.card h3` or `[data-layout="x"] .title` hides
CSS in another element's class; an element class outside its block breaks reuse.

Usage:
  python bem_lint.py PATH [PATH ...]          files or folders (*.css, *.html)
  python bem_lint.py --base base.css site.css pages/
  python bem_lint.py --selftest

Options:
  --base FILE        stylesheet allowed to use tag selectors (reset / typography base);
                     a file whose first comment contains "bem-lint: base" counts too
  --skip-class NAME  HTML: do not descend into elements carrying this class (third-party or
                     PHP-rendered widget markup); repeatable; globs match any class, Bricks
                     element classes included (`--skip-class 'brxe-mbk-*'`)
  --prefix PREFIX    every class (CSS selectors, HTML class attributes) must start with PREFIX
                     (e.g. `w-`); state classes is-* / has-* and Bricks / WordPress internals
                     are exempt
  --strict           warnings fail too
  --json             machine-readable report

Exit code 1 when an error (or, with --strict, a warning) is reported.

Section override: `.section-block .component` (exactly two compounds, descendant combinator,
the first one a single section block class - a block on a `data-brx="section"` element in the
linted HTML - the second only classes of one other block plus state classes / pseudos) is the
one allowed cross-block selector.

HTML structure (`data-brx`): section > container > block/div. A `data-brx="section"` element
carries a block class, its element children are `data-brx="container"` with an element class
of that block; with any data-brx in a file every <section> is `data-brx="section"`. A block
whose classes appear inside two or more section blocks without being a component warns
(`shared-block`): only components are reused across sections. Components are blocks on / inside
a `data-component` element, or blocks styled (selector subjects) in a stylesheet whose first
comment contains "bem-lint: components" (global classes such as type styles; tag selectors stay
forbidden there).

CSS escape hatch: a comment containing "bem-lint: allow" (plus a reason) immediately before a
rule skips that rule, e.g. a node created by JavaScript that has no element of its own.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# ------------------------------------------------------------------ BEM names
BEM = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$")
STATE = re.compile(r"^(?:is|has)-[a-z0-9-]+$")
IGNORED_CLASS = re.compile(r"^(?:brxe?-|bricks-|wp-|pi-)")  # Bricks / WordPress / icon-sprite internals


def block_of(cls: str) -> str:
    return re.split(r"__|--", cls, maxsplit=1)[0]


def element_of(cls: str) -> str:
    return cls.split("--", 1)[0]


class Report:
    def __init__(self) -> None:
        self.items: list[dict] = []
        self.allowed = 0

    def add(self, level: str, file: str, line: int, rule: str, msg: str) -> None:
        self.items.append({"level": level, "file": file, "line": line, "rule": rule, "message": msg})

    def count(self, level: str) -> int:
        return sum(1 for i in self.items if i["level"] == level)


# ------------------------------------------------------------------ CSS
def strip_comments(css: str) -> list[tuple[int, str, bool, str]]:
    """Rules as (line, prelude, allowed, body), nested at-rule contents flattened."""
    out: list[tuple[int, str, bool, str]] = []

    def walk(text: str, offset_line: int) -> None:
        i, n = 0, len(text)
        allow_next = False
        prelude_start = 0
        while i < n:
            if text.startswith("/*", i):
                end = text.find("*/", i + 2)
                end = n if end < 0 else end + 2
                if "bem-lint: allow" in text[i:end]:
                    allow_next = True
                text = text[:i] + " " * (end - i) + text[end:]
                i = end
                continue
            ch = text[i]
            if ch in "\"'":
                j = i + 1
                while j < n and text[j] != ch:
                    j += 2 if text[j] == "\\" else 1
                i = j + 1
                continue
            if ch == "{":
                prelude = text[prelude_start:i].strip()
                depth, j = 1, i + 1
                while j < n and depth:
                    if text[j] == "{":
                        depth += 1
                    elif text[j] == "}":
                        depth -= 1
                    j += 1
                body = text[i + 1:j - 1]
                line = offset_line + text.count("\n", 0, prelude_start + len(text[prelude_start:i]) - len(text[prelude_start:i].lstrip()))
                if prelude.startswith("@"):
                    kw = prelude.split()[0].lower()
                    if kw in ("@media", "@supports", "@layer", "@container", "@scope"):
                        walk(body, offset_line + text.count("\n", 0, i + 1))
                    # @keyframes, @font-face, @property, @page: no selectors to check
                elif prelude:
                    out.append((line, prelude, allow_next, body))
                allow_next = False
                i = j
                prelude_start = i
                continue
            if ch == ";":
                prelude_start = i + 1
            if ch == "}":
                prelude_start = i + 1
            i += 1

    walk(css, 1)
    return out


def split_top(s: str, sep: str = ",") -> list[str]:
    parts, depth, cur = [], 0, []
    quote = None
    for ch in s:
        if quote:
            cur.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return [p.strip() for p in parts if p.strip()]


FUNC = re.compile(r":(is|where|not|has|matches|-webkit-any)\(", re.I)


def split_complex(sel: str) -> tuple[list[str], list[str]]:
    """Split a complex selector into compound selectors and the combinators between them
    (`" "` descendant, `>`, `+`, `~`)."""
    out, combs, depth, cur, quote, comb = [], [], 0, [], None, None
    for ch in sel:
        if quote:
            cur.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if depth == 0 and (ch.isspace() or ch in ">+~"):
            if cur:
                out.append("".join(cur))
                cur = []
            if ch in ">+~":
                comb = ch
            continue
        if not cur and out:
            combs.append(comb or " ")
            comb = None
        cur.append(ch)
    if cur:
        out.append("".join(cur))
    return out, combs


def compounds(sel: str) -> list[str]:
    """Split a complex selector into compound selectors (combinators dropped)."""
    return split_complex(sel)[0]


def outer(compound: str) -> str:
    """Compound without the contents of functional pseudo-classes / attribute selectors."""
    res, depth = [], 0
    for ch in compound:
        if ch in "([":
            depth += 1
            if depth == 1:
                res.append(ch)
            continue
        if ch in ")]":
            depth -= 1
            if depth == 0:
                res.append(ch)
            continue
        if depth == 0:
            res.append(ch)
    return "".join(res)


def func_args(compound: str) -> list[tuple[str, str]]:
    out = []
    for m in FUNC.finditer(compound):
        depth, j = 1, m.end()
        while j < len(compound) and depth:
            depth += {"(": 1, ")": -1}.get(compound[j], 0)
            j += 1
        out.append((m.group(1).lower(), compound[m.end():j - 1]))
    return out


TYPE_RE = re.compile(r"^(?:[a-zA-Z][a-zA-Z0-9-]*|\*)")
CONTEXT_TYPES = {"html", "body", ":root"}


def classes_in(compound: str) -> list[str]:
    return re.findall(r"\.(-?[_a-zA-Z][\w-]*)", outer(compound))


def all_classes(sel: str) -> list[str]:
    """Every class of a selector, inside :is()/:not()/… too (attribute values dropped)."""
    return re.findall(r"\.(-?[_a-zA-Z][\w-]*)", re.sub(r"\[[^\]]*\]", "", sel))


def prefix_missing(classes, prefix: str | None) -> list[str]:
    """Classes that break the --prefix convention (state and Bricks / WP internals exempt)."""
    if not prefix:
        return []
    out: list[str] = []
    for c in classes:
        if not c.startswith(prefix) and not STATE.match(c) and not IGNORED_CLASS.match(c) and c not in out:
            out.append(c)
    return out


OVERRIDE_SUBJECT = re.compile(r"(?:\.-?[_a-zA-Z][\w-]*|::?[\w-]+(?:\(\))?)+")


def section_override(sel: str, section_blocks: set[str]) -> bool:
    """`.section-block .component`: exactly two compounds joined by a descendant space; the
    first one a single section block class, the second only classes of ONE other block (block,
    element, modifier) plus state classes and pseudo-classes / -elements."""
    parts, combs = split_complex(sel)
    if len(parts) != 2 or combs != [" "]:
        return False
    m = re.fullmatch(r"\.(-?[_a-zA-Z][\w-]*)", parts[0])
    if not m or m.group(1) not in section_blocks:
        return False
    if not OVERRIDE_SUBJECT.fullmatch(outer(parts[1])):
        return False
    blocks = {block_of(c) for c in classes_in(parts[1]) if not STATE.match(c) and not IGNORED_CLASS.match(c)}
    return len(blocks) == 1 and m.group(1) not in blocks


def check_selector(sel: str, base: bool, rep: Report, file: str, line: int, defined: set[str],
                   section_blocks: set[str] = frozenset(), prefix: str | None = None) -> None:
    bad = prefix_missing(all_classes(sel), prefix)
    if bad:
        rep.add("error", file, line, "prefix", f"`{sel}`: " + ", ".join(f"`.{c}`" for c in bad) + f" - every class starts with `{prefix}`")
    sel = sel.replace("%root%", ".root-placeholder")
    if re.search(r"\[data-layout", sel):
        rep.add("error", file, line, "layout-attr", f"`{sel}`: style the layout's block class (`.{{layout}}`, `.{{layout}}__...`), never [data-layout]")
    if "#" in re.sub(r"\[[^\]]*\]|\([^)]*\)", "", sel):
        rep.add("error", file, line, "id-selector", f"`{sel}`: style a class, not an id")
    parts = compounds(sel)
    if not parts:
        return
    subject, ancestors = parts[-1], parts[:-1]

    # tag selectors, also inside :is()/:where()/:has()/:not()
    if not base:
        for k, comp in enumerate(parts):
            t = TYPE_RE.match(outer(comp))
            if t and not (k == 0 and t.group(0).lower() in CONTEXT_TYPES and len(parts) > 1):
                if not (t.group(0) == "*" and k == len(parts) - 1 and len(parts) == 1):
                    rep.add("error", file, line, "tag-selector", f"`{sel}`: tag `{t.group(0)}` - give that element its own BEM class")
                    break
            for fn, args in func_args(comp):
                for inner in split_top(args):
                    inner_parts = compounds(inner)
                    if fn != "has" and len(inner_parts) > 1:
                        rep.add("error", file, line, "hidden-descendant", f"`{sel}`: combinator inside :{fn}() styles a descendant - use the descendant's own class")
                    if any(TYPE_RE.match(outer(p)) for p in inner_parts):
                        rep.add("error", file, line, "tag-selector", f"`{sel}`: tag inside :{fn}() - use classes")

    # [data-surface] only as the section's own token rule
    for comp in ancestors:
        if "[data-surface" in comp:
            rep.add("error", file, line, "surface-descendant", f"`{sel}`: a surface may only set custom properties on the section itself; components read those tokens")
            break

    subj_classes = [c for c in classes_in(subject) if not STATE.match(c) and not IGNORED_CLASS.match(c)]
    subj_blocks = {block_of(c) for c in subj_classes}
    if not subj_classes:
        bare = outer(subject)
        context_only = re.fullmatch(r"(?:html|body|:root)?(?:\[[^\]]*\]|::?[\w-]+(?:\([^)]*\))?)*", bare.strip())
        if not (base or context_only and ("[data-surface" in subject or "[data-theme" in subject or "[data-brx-theme" in subject or bare.startswith((":root", "html", "body")))):
            if not (base and TYPE_RE.match(bare)):
                rep.add("error", file, line, "no-class-subject", f"`{sel}`: the styled element has no class")
    for c in subj_classes:
        if not BEM.match(c) and c != "root-placeholder":
            rep.add("warning", file, line, "bem-name", f"`.{c}` is not block__element--modifier kebab-case")

    for comp in [] if section_override(sel, section_blocks) else ancestors:
        anc = [c for c in classes_in(comp) if not IGNORED_CLASS.match(c)]
        named = [c for c in anc if not STATE.match(c)]
        if not named:
            continue  # state / theme context only
        if subj_blocks and all(block_of(c) in subj_blocks for c in named):
            continue  # same block: block, its modifier or element as context
        if not subj_blocks:
            continue
        rep.add("error", file, line, "cross-block", f"`{sel}`: `.{named[0]}` styles inside block `{sorted(subj_blocks)[0]}` - mix a class onto the element instead (only `.section-block .component` may cross blocks)")
        break

    for c in classes_in(sel):
        if "__" in c and not IGNORED_CLASS.match(c):
            defined.add(c)


def lint_css(text: str, file: str, base: bool, rep: Report, defined: set[str], blocks: set[str],
             section_blocks: set[str] = frozenset(), prefix: str | None = None,
             components: set[str] | None = None) -> None:
    """`components` collects the subject blocks of a stylesheet marked `bem-lint: components`."""
    first = re.match(r"\s*/\*(.*?)\*/", text, re.S)
    base = base or bool(first and "bem-lint: base" in first.group(1))
    is_components = bool(first and "bem-lint: components" in first.group(1))
    for line, prelude, allowed, body in strip_comments(text):
        if is_components and components is not None:
            # allowed rules too: an exempted rule still defines its component block
            for sel in split_top(prelude):
                parts = compounds(sel)
                if parts:
                    components |= {block_of(c) for c in classes_in(parts[-1]) if not STATE.match(c) and not IGNORED_CLASS.match(c)}
        if allowed:
            rep.allowed += 1
            continue
        for sel in split_top(prelude):
            check_selector(sel, base, rep, file, line, defined, section_blocks, prefix)
            for c in classes_in(sel):
                if "__" not in c and "--" not in c:
                    blocks.add(c)
        if not base and "!important" in body:
            rep.add("warning", file, line, "important", f"`{prelude}`: `!important` - fix the specificity instead (utilities: precede the rule with `/* bem-lint: allow utility */`)")


# ------------------------------------------------------------------ HTML
INLINE_OK = {"strong", "em", "b", "i", "br", "wbr", "small", "sup", "sub", "abbr", "code", "kbd", "s", "u", "mark", "q", "cite", "dfn", "time", "bdi", "bdo"}
TABLE_PARTS = {"thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col"}
SKIP_TAGS = {"html", "head", "body", "script", "style", "template", "noscript", "option", "optgroup", "source", "track", "param", "area", "meta", "link", "title", "base", "svg", "picture"}
TEXT_PARENTS = {"p", "li", "dd", "dt", "td", "th", "figcaption", "label", "small", "strong", "em", "blockquote", "summary", "legend", "caption", "h1", "h2", "h3", "h4", "h5", "h6"}
LANDMARKS = {"header", "main", "footer"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
BRX_TYPES = {"section", "container", "block", "div"}
NON_RENDERED = {"script", "style", "template", "noscript"}


class HtmlFacts:
    """Facts collected over every linted HTML file: section blocks (for the CSS section
    override), component blocks and the section blocks each other block appears in."""

    def __init__(self) -> None:
        self.section_blocks: set[str] = set()
        self.component_blocks: set[str] = set()
        self.in_sections: dict[str, dict[str, tuple[str, int]]] = {}


class Lint(HTMLParser):
    def __init__(self, file: str, rep: Report, skip_classes: set[str], prefix: str | None = None,
                 facts: HtmlFacts | None = None) -> None:
        super().__init__(convert_charrefs=True)
        self.file, self.rep, self.skip, self.prefix = file, rep, skip_classes, prefix
        self.facts = facts or HtmlFacts()
        self.stack: list[dict] = []
        self.skip_depth = 0
        self.used: set[str] = set()
        self.uses_brx = False
        self.bare_sections: list[int] = []

    def _blocks_above(self) -> set[str]:
        out: set[str] = set()
        for fr in self.stack:
            out |= {block_of(c) for c in fr["classes"]}
        return out

    def _brx(self, tag: str, attrs: dict, frame: dict, named: list[str], line: int) -> None:
        """data-brx structure: section > container (element of the section block) > block/div."""
        brx = frame["brx"]
        if "data-brx" in attrs:
            self.uses_brx = True
            if brx not in BRX_TYPES:
                self.rep.add("error", self.file, line, "brx-structure", f"data-brx=\"{brx}\" - use section, container, block or div")
        if tag == "section" and brx != "section":
            self.bare_sections.append(line)
        if brx == "section":
            if named and "__" not in named[0] and "--" not in named[0]:
                frame["section"] = named[0]
                self.facts.section_blocks.add(named[0])
            else:
                self.rep.add("error", self.file, line, "brx-structure", f"data-brx=\"section\" needs its section block as first class (`w-x`), got `{named[0] if named else ''}`")
        if brx == "container":
            sec = next((fr["section"] for fr in reversed(self.stack) if fr["section"]), None)
            if sec and not (named and all("__" in c and block_of(c) == sec for c in named)):
                self.rep.add("error", self.file, line, "brx-structure", f"container class `{' '.join(named)}` must be an element of section block `{sec}` (`{sec}__container`)")

    def close(self) -> None:
        super().close()
        if self.uses_brx:
            for line in self.bare_sections:
                self.rep.add("error", self.file, line, "brx-structure", "<section> without data-brx=\"section\" in a file that uses data-brx")
        self.bare_sections = []

    def handle_starttag(self, tag: str, attrs_list) -> None:
        attrs = dict(attrs_list)
        classes = [c for c in (attrs.get("class") or "").split() if not IGNORED_CLASS.match(c)]
        frame = {"tag": tag, "classes": classes, "skip": False, "prose": False, "component": "data-component" in attrs,
                 "brx": attrs.get("data-brx"), "section": None}
        parent = self.stack[-1] if self.stack else None
        inherited_skip = bool(parent and parent["skip"])
        prose = bool(parent and parent["prose"])
        if inherited_skip or tag in SKIP_TAGS:
            frame["skip"] = tag not in ("html", "body", "head") or inherited_skip
        # third-party widget roots (--skip-class) and Bricks runtime markers (brx-query-trail…);
        # <body class="brx-body"> is a page, not a marker — never skip html/head/body
        raw = (attrs.get("class") or "").split()
        if any(fnmatch.fnmatchcase(c, pat) for pat in self.skip for c in raw) or (tag not in ("html", "head", "body") and any(re.match(r"^brx-(?!e)", c) for c in raw)):
            frame["skip"] = True
        frame["prose"] = prose or "prose" in classes or "data-prose" in attrs
        line = self.getpos()[0]

        if parent and parent["brx"] == "section" and not parent["skip"] and tag not in NON_RENDERED and frame["brx"] != "container":
            self.rep.add("error", self.file, line, "brx-structure", f"<{tag}> directly inside a data-brx=\"section\" - the section's children are data-brx=\"container\"")

        if not frame["skip"] and tag not in ("html", "head", "body"):
            self.used |= set(classes)
            named = [c for c in classes if not STATE.match(c)]
            bad = prefix_missing(classes, self.prefix)
            if bad:
                self.rep.add("error", self.file, line, "prefix", ", ".join(f"`{c}`" for c in bad) + f" - every class starts with `{self.prefix}`")
            self._brx(tag, attrs, frame, named, line)
            in_component = any(fr["component"] for fr in self.stack + [frame])
            if frame["component"]:
                self.facts.component_blocks |= {block_of(c) for c in named}
            sec = next((fr["section"] for fr in reversed(self.stack) if fr["section"]), None)
            if sec and not in_component:
                for c in named:
                    if block_of(c) != sec:
                        self.facts.in_sections.setdefault(block_of(c), {}).setdefault(sec, (self.file, line))
            if not named and not frame["prose"]:
                ok = (
                    tag in TABLE_PARTS
                    or (tag in INLINE_OK and parent is not None)
                    or (tag == "i" and "data-icon" in attrs)
                    or (tag == "a" and parent is not None and parent["tag"] in TEXT_PARENTS and not attrs.get("data-prop"))
                    or (tag in LANDMARKS and parent is not None and parent["tag"] == "body")
                )
                if not ok:
                    self.rep.add("error", self.file, line, "no-class", f"<{tag}> has no class - every element that renders in Bricks needs its own BEM class")
            for c in named:
                if not BEM.match(c):
                    self.rep.add("warning", self.file, line, "bem-name", f"class `{c}` is not block__element--modifier kebab-case")
                if "--" in c and element_of(c) not in classes:
                    self.rep.add("error", self.file, line, "modifier-alone", f"`{c}` without `{element_of(c)}` on the same element")
                if "__" in c and block_of(c) not in (self._blocks_above()):
                    self.rep.add("error", self.file, line, "element-outside-block", f"`{c}` is not inside a `.{block_of(c)}...` ancestor")
            if "data-prop" in attrs and not any(fr["component"] for fr in self.stack + [frame]):
                self.rep.add("error", self.file, line, "prop-outside-component", f"data-prop=\"{attrs['data-prop']}\" outside a data-component root")
            if frame["component"] and not named:
                self.rep.add("error", self.file, line, "component-no-block", f"data-component=\"{attrs['data-component']}\" root needs its block class")
        if tag not in VOID:
            self.stack.append(frame)

    def handle_startendtag(self, tag, attrs) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1]["tag"] == tag:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        for k in range(len(self.stack) - 1, -1, -1):
            if self.stack[k]["tag"] == tag:
                del self.stack[k:]
                return


# ------------------------------------------------------------------ driver
def run(paths: list[Path], base_files: set[Path], skip_classes: set[str], prefix: str | None = None) -> Report:
    rep = Report()
    defined: set[str] = set()
    blocks: set[str] = set()
    facts = HtmlFacts()
    files: list[Path] = []
    for p in paths:
        files += sorted(p.rglob("*")) if p.is_dir() else [p]
    # HTML first: its section blocks decide which `.section-block .component` selectors are allowed
    for f in files:
        if f.suffix.lower() in (".html", ".htm"):
            lp = Lint(str(f), rep, skip_classes, prefix, facts)
            lp.feed(f.read_text(encoding="utf8", errors="replace"))
            lp.close()
            blocks |= {c for c in lp.used if "__" not in c and "--" not in c}
    for f in files:
        if f.suffix.lower() == ".css":
            text = f.read_text(encoding="utf8", errors="replace")
            lint_css(text, str(f), f.resolve() in base_files, rep, defined, blocks, facts.section_blocks, prefix,
                     facts.component_blocks)
    for b, secs in sorted(facts.in_sections.items()):
        if len(secs) > 1 and b not in facts.component_blocks:
            file, line = min(secs.values())
            rep.add("warning", file, line, "shared-block", f"block `{b}` is used inside sections {', '.join(f'`{s}`' for s in sorted(secs))} - only components are reused across sections (data-component, or a block styled in a `bem-lint: components` stylesheet), otherwise give each section its own element class")
    for c in sorted(defined):
        if block_of(c) not in blocks:
            rep.add("warning", "-", 0, "orphan-element", f"`.{c}` has no `.{block_of(c)}` block in the CSS or HTML")
    return rep


def selftest() -> int:
    import tempfile
    sec_html = ('<section class="w-about" data-brx="section"><div class="w-about__container" data-brx="container">'
                '<h3 class="w-heading-m">x</h3></div></section>')
    sec_css = ".w-about { x: 1; }\n.w-about__container { x: 1; }\n.w-heading-m { x: 1; }\n.w-card-stay { x: 1; }\n"

    def two_sections(inner: str) -> str:
        return "".join(f'<section class="w-{s}" data-brx="section"><div class="w-{s}__container" data-brx="container">{inner}</div></section>' for s in "ab")

    cases = [
        # (name, css, html, expected rule or None = no report at all[, --prefix])
        ("clean block", ".card { color: red; }\n.card__title:hover { x: 1; }\n.card--wide .card__title { x: 1; }", "", None),
        ("tag", ".card h3 { x: 1; }", "", "tag-selector"),
        ("tag in :is", ":is(.seg > :is(a, button)) { x: 1; }", "", "tag-selector"),
        ("layout attr", '[data-layout="hero"] .hero__title { x: 1; }', "", "layout-attr"),
        ("surface descendant", '[data-surface="inverse"] .btn { x: 1; }', "", "surface-descendant"),
        ("surface tokens ok", '[data-surface="inverse"] { --btn-bg: #fff; }', "", None),
        ("cross block", ".closing-card .btn { x: 1; }", "", "cross-block"),
        ("state context ok", ".nav__item.is-open > .nav__link { x: 1; }\n.nav { x: 1; }", "", None),
        ("theme context ok", 'html[data-brx-theme="dark"] .card { x: 1; }\n[data-brx-theme="dark"] { --x: 1; }', "", None),
        ("allow comment", "/* bem-lint: allow js-node */\n.msg > .typing__out { x: 1; }\n.msg { x: 1; }", "", None),
        ("id", "#hero { x: 1; }", "", "id-selector"),
        ("orphan element", ".hero__title { x: 1; }", "", "orphan-element"),
        ("html no class", "", '<section class="hero"><div><p class="hero__lede">x</p></div></section>', "no-class"),
        ("html inline ok", "", '<div class="hero"><p class="hero__lede">x <strong>y</strong> <a href="#">z</a></p></div>', None),
        ("element outside block", "", '<section class="hero"></section><p class="card__text">x</p>', "element-outside-block"),
        ("modifier alone", "", '<a class="btn--ghost" href="#">x</a>', "modifier-alone"),
        ("prop outside component", "", '<div class="hero"><span class="hero__label" data-prop="label">x</span></div>', "prop-outside-component"),
        ("component ok", "", '<a class="btn btn--primary" data-component="Button: Primary" href="#"><span class="btn__label" data-prop="label">Go</span></a>', None),
        ("skip widget", "", '<div class="widget-x"><div><span>raw</span></div></div>', None),
        ("skip widget glob", "", '<div class="brxe-mbk-form seg"><div><span>raw</span></div></div>', None),
        ("bricks loop marker", "", '<ul class="menu"><li class="brxe-a1 menu__item">x</li><li class="brx-query-trail" data-query-element-id="a1"></li></ul>', None),
        ("bricks page body", "", '<html><body class="brx-body bricks-is-frontend"><main class="brxe-section"><div class="brxe-block">x</div></main></body></html>', "no-class"),
        ("important warns", ".card { color: red !important; }", "", "important"),
        ("important in base ok", "/* bem-lint: base */\n[hidden] { display: none !important; }", "", None),
        ("important allowed utility", "/* bem-lint: allow utility */\n.hide-md { display: none !important; }", "", None),
        # --prefix
        ("prefix off", ".btn { x: 1; }", '<div class="hero">x</div>', None),
        ("prefix css", ".btn { x: 1; }", "", "prefix", "w-"),
        ("prefix in :is", ".w-nav:is(.open) { x: 1; }", "", "prefix", "w-"),
        ("prefix html", "", '<div class="hero">x</div>', "prefix", "w-"),
        ("prefix exempt state/internals", ".w-nav.is-open .w-nav__link { x: 1; }\n.brxe-abc.w-nav { x: 1; }",
         '<nav class="w-nav is-open brxe-abc wp-block"><a class="w-nav__link" href="#">x</a></nav>', None, "w-"),
        # section override: `.section-block .component`
        ("override allowed", sec_css + ".w-about .w-heading-m { max-width: 18ch; }\n.w-about .w-heading-m:hover::after { x: 1; }\n"
         ".w-about .w-card-stay__title.is-active { x: 1; }\n.w-about .w-card-stay--compact.w-card-stay:not(.is-open) { x: 1; }", sec_html, None, "w-"),
        ("override three compounds", sec_css + ".w-about .w-about__container .w-heading-m { x: 1; }", sec_html, "cross-block", "w-"),
        ("override child combinator", sec_css + ".w-about > .w-heading-m { x: 1; }", sec_html, "cross-block", "w-"),
        ("override element first", sec_css + ".w-about__container .w-heading-m { x: 1; }", sec_html, "cross-block", "w-"),
        ("override modifier first", sec_css + ".w-about--dark .w-heading-m { x: 1; }", sec_html, "cross-block", "w-"),
        ("override state first", sec_css + ".w-about.is-open .w-heading-m { x: 1; }", sec_html, "cross-block", "w-"),
        ("override not a section", sec_css + ".w-card-stay .w-heading-m { x: 1; }", sec_html, "cross-block", "w-"),
        ("override two blocks", sec_css + ".w-about .w-heading-m.w-card-stay { x: 1; }", sec_html, "cross-block", "w-"),
        ("override attribute", sec_css + ".w-about .w-heading-m[data-x] { x: 1; }", sec_html, "cross-block", "w-"),
        ("override without html", sec_css + ".w-about .w-heading-m { x: 1; }", "", "cross-block", "w-"),
        # data-brx structure
        ("brx clean", "", sec_html + '<section class="w-faq" data-brx="section"><div class="w-faq__container w-faq__container--narrow" data-brx="container">'
         '<div class="w-faq__list" data-brx="block">x</div></div></section>', None, "w-"),
        ("brx bad value", "", '<div class="w-x" data-brx="row">x</div>', "brx-structure"),
        ("brx bare section", "", sec_html + '<section class="w-faq"><div class="w-faq__inner">x</div></section>', "brx-structure"),
        ("no brx bare section ok", "", '<section class="hero"><p class="hero__lede">x</p></section>', None),
        ("brx section element class", "", '<section class="w-about__x" data-brx="section"><div class="w-about__container" data-brx="container">x</div></section>', "brx-structure"),
        ("brx child not container", "", '<section class="w-a" data-brx="section"><div class="w-a__inner">x</div></section>', "brx-structure"),
        ("brx container foreign class", "", '<section class="w-a" data-brx="section"><div class="w-container" data-brx="container">x</div></section>', "brx-structure"),
        # shared-block
        ("shared block warns", "", two_sections('<p class="w-lede">x</p>'), "shared-block"),
        ("component across sections ok", "", two_sections('<article class="w-card" data-component="Card"><p class="w-card__title">x</p></article>'), None),
        ("shared block warns without marker", "/* type styles */\n.w-lede { x: 1; }", two_sections('<p class="w-lede">x</p>'), "shared-block"),
        ("components stylesheet quiet", "/* bem-lint: components */\n.w-lede { x: 1; }", two_sections('<p class="w-lede">x</p>'), None),
        ("components stylesheet no tags", "/* bem-lint: components */\n.w-lede p { x: 1; }", "", "tag-selector"),
        ("components stylesheet allowed rule", "/* bem-lint: components */\n.w-lede { x: 1; }\n/* bem-lint: allow utility */\n.w-visually-hidden { clip: rect(0 0 0 0) !important; }",
         two_sections('<p class="w-lede">x</p><span class="w-visually-hidden">y</span>'), None),
    ]
    failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for name, css, html, expect, *opt in cases:
            d = Path(tmp) / re.sub(r"\W+", "_", name)
            d.mkdir()
            paths = []
            if css:
                (d / "a.css").write_text(css, encoding="utf8")
                paths.append(d / "a.css")
            if html:
                (d / "a.html").write_text(html, encoding="utf8")
                paths.append(d / "a.html")
            rep = run(paths, set(), {"widget-x", "brxe-mbk-*"}, opt[0] if opt else None)
            rules = {i["rule"] for i in rep.items}
            ok = (expect in rules) if expect else not rep.items
            if not ok:
                failed += 1
                print(f"FAIL {name}: expected {expect or 'clean'}, got {sorted(rules)}")
            else:
                print(f"ok   {name}")
    print(f"{len(cases) - failed}/{len(cases)} passed")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", type=Path)
    ap.add_argument("--base", action="append", type=Path, default=[])
    ap.add_argument("--skip-class", action="append", default=[])
    ap.add_argument("--prefix")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.paths:
        ap.error("give at least one file or folder")
    paths = a.paths + a.base
    rep = run(paths, {p.resolve() for p in a.base}, set(a.skip_class), a.prefix)
    if a.json:
        print(json.dumps({"errors": rep.count("error"), "warnings": rep.count("warning"), "allowed": rep.allowed, "items": rep.items}, indent=1))
    else:
        for i in rep.items:
            print(f"{i['file']}:{i['line']}: {i['level']} [{i['rule']}] {i['message']}")
        print(f"bem-lint: {rep.count('error')} error(s), {rep.count('warning')} warning(s), {rep.allowed} allowed rule(s)")
    return 1 if rep.count("error") or (a.strict and rep.count("warning")) else 0


if __name__ == "__main__":
    sys.exit(main())
