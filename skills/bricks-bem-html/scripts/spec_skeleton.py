"""Turn a bricks_export.php tree into an editable spec_builder script (conversion of an existing
Bricks area to the BEM system).

    python spec_skeleton.py export.json build.py [--seed area-bem]

Writes build.py (tree as `node(...)` calls with every setting kept: text, links, dynamic data,
queries, conditions, attributes) and build.classes.css (current CSS of every class the area uses,
for reference). The skeleton runs as-is only after you register CSS; it marks what to fix:
  # FIX no class        element without a global class (rule 1)
  # FIX _cssClasses     plain class string — make it a global class
  # FIX icon            static <i data-icon> placeholder already turned into icon(); check classes
  # FIX dynamic icon    data-icon from dynamic data — use an SVG element with source dynamicData
  # FIX element CSS     styles stored on the element instead of its class (rule: CSS in the class)
Labels are guessed from the class / tag / text; rename them to what an editor reads in Structure.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import pprint
import re

STYLE_SKIP = {"_cssGlobalClasses", "_attributes", "_cssId", "_hidden", "_conditions", "_interactions", "_cssClasses"}
ICON_ATTR = "data-icon"


def human(s: str) -> str:
    return s.replace("-", " ").replace("_", " ").strip().capitalize()


def guess_label(n: dict) -> str:
    if n.get("label"):
        return n["label"]
    s = n["settings"] or {}
    cls = next((c for c in n["classes"] if not c.startswith(("is-", "has-"))), "")
    if cls:
        block, _, elem = cls.partition("__")
        elem = elem.split("--")[0]
        return f"{human(block)} · {human(elem)}" if elem else human(block)
    text = re.sub(r"<[^>]+>|\s+", " ", str(s.get("text", ""))).strip()
    tag = s.get("customTag") or s.get("tag") or n["name"]
    return f"{human(tag)} · {text[:28]}" if text else human(tag)


def icon_name(s: dict) -> str | None:
    for a in s.get("_attributes", []) or []:
        if a.get("name") == ICON_ATTR:
            return a.get("value", "")
    return None


ICON_TAG: str | None = None  # --icon-tag: site tag that returns SVG for an icon name ({<tag>:<source>})


def emit(n: dict, depth: int, out: list[str]) -> None:
    pad = "    " * depth
    s = dict(n["settings"] or {})
    label = guess_label(n)
    cls = " ".join(n["classes"])
    notes = []
    if n.get("component"):
        props = pprint.pformat(n.get("properties") or {}, width=100, sort_dicts=False)
        out.append(f"{pad}instance({n['component']!r}, {label!r}),  # properties now: {props}")
        return
    ico = icon_name(s)
    if ico is not None and not n["children"]:
        # the PHP placeholder renderer added `icon`; the SVG element needs it as a class
        icls = cls if "icon" in n["classes"] else f"icon {cls}".strip()
        if "{" in ico and ICON_TAG:
            st = {"source": "dynamicData", "dynamicData": "{" + f"{ICON_TAG}:{ico.strip('{}')}" + "}",
                  "_attributes": [{"name": "aria-hidden", "value": "true"}]}
            out.append(f"{pad}node('svg', {('Icon · ' + ico.strip('{}'))!r}, {icls!r}, {st!r}),  # FIX check: dynamic icon via {{{ICON_TAG}:…}}")
            return
        if "{" in ico:
            notes.append(f"FIX dynamic icon ({ico}): SVG element, source dynamicData (pass --icon-tag)")
        else:
            out.append(f"{pad}icon({ico!r}, {icls!r}),  # FIX icon: was <{s.get('customTag', 'div')} data-icon>")
            return
    if not n["classes"]:
        notes.append("FIX no class")
    if s.get("_cssClasses"):
        notes.append(f"FIX _cssClasses {s['_cssClasses']!r}")
    styles = sorted(k for k in s if k.startswith("_") and k not in STYLE_SKIP)
    if styles:
        notes.append(f"FIX element CSS {styles}")
    body = pprint.pformat(s, width=110, sort_dicts=False) if s else "{}"
    body = body.replace("\n", "\n" + pad + "    ")
    comment = f"  # {'; '.join(notes)}" if notes else ""
    if n["children"]:
        out.append(f"{pad}node({n['name']!r}, {label!r}, {cls!r}, {body}, [{comment}")
        for c in n["children"]:
            emit(c, depth + 1, out)
        out.append(f"{pad}]),")
    else:
        out.append(f"{pad}node({n['name']!r}, {label!r}, {cls!r}, {body}),{comment}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("export")
    ap.add_argument("out")
    ap.add_argument("--seed", default=None)
    ap.add_argument("--icon-tag", default=None, help="dynamic data tag returning SVG markup for an icon name, e.g. kp_icon")
    a = ap.parse_args()
    global ICON_TAG
    ICON_TAG = a.icon_tag
    data = json.loads(pathlib.Path(a.export).read_text(encoding="utf8"))
    out_py = pathlib.Path(a.out)
    seed = a.seed or f"post-{data['postId']}-bem"

    lines = [
        f'"""{data["title"]} (post {data["postId"]}, {data["area"]}) — skeleton from bricks_export.php.',
        "Edit into the BEM spec: classes on every element, CSS per class (css()), components, labels.",
        f'Current class CSS: {out_py.with_suffix(".classes.css").name}"""',
        "import pathlib",
        "import sys",
        "",
        'sys.path.insert(0, str(pathlib.Path.home() / ".agents/skills/bricks-bem-html/scripts"))',
        "from spec_builder import Spec  # noqa: E402",
        "",
        f"S = Spec({seed!r}, shared=set())",
        "node, icon, instance = S.node, S.icon, S.instance",
        "",
        "tree = [",
    ]
    body: list[str] = []
    for r in data["elements"]:
        emit(r, 1, body)
    lines += body + ["]", "", f'# S.write(pathlib.Path(__file__).with_suffix(".json"), tree, icons={{"set": "…", "dir": "…"}})', ""]
    out_py.write_text("\n".join(lines), encoding="utf8")

    css = [f"/* {name} | {c['category']}{' | controls: ' + ','.join(c['controls']) if c['controls'] else ''} */\n{c['css']}\n"
           for name, c in data["classes"].items()]
    out_py.with_suffix(".classes.css").write_text("\n".join(css), encoding="utf8")
    fixes = sum(line.count("FIX") for line in body)
    print(f"{out_py}: {len(body)} lines, {fixes} FIX notes; {len(data['classes'])} classes -> {out_py.with_suffix('.classes.css').name}")


if __name__ == "__main__":
    main()
