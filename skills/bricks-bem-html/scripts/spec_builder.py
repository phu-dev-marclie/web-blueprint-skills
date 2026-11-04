"""Describe a Bricks area (header, footer, section, page) as BEM elements + global-class CSS +
components, then write a spec.json for bricks_apply.php.

    import sys; sys.path.insert(0, "<skill>/scripts")
    from spec_builder import Spec
    S = Spec(seed="site-header", shared={"wrap", "btn", "icon", "icon--sm"})
    S.css("kp-header", "%root% { position: sticky; top: 0; }", "Site chrome")
    header = S.box("Header", "kp-header", children=[ ... ])
    S.write("spec.json", [header], obsolete=["old-class"])

Every element gets a structure label and its own classes; `css()` registers the CSS of each
class (write `%root%`, it is stored as `.class`). `write()` fails when an element uses a class
without a CSS entry (empty string = hook class) or a CSS entry is unused, so the spec and the
CSS cannot drift. Classes in `shared` already exist on the site and are not managed here.
A project design-system module registers its whole catalogue with `css(..., optional=True)` and
`component(..., optional=True)`: write() keeps only the entries the area uses (elements, used
components and their elements), so every area upserts the same definitions without carrying
CSS it does not use.
"""
from __future__ import annotations

import json
import pathlib
import random
import string


class Spec:
    def __init__(self, seed: str, shared=()):
        self.rng = random.Random(seed)
        self.shared = set(shared)
        self.CSS: dict[str, tuple[str, str]] = {}
        self.COMPONENTS: dict[str, dict] = {}
        self.optional: set[str] = set()  # css()/component() entries written only when used

    # ------------------------------------------------------------ ids / attributes
    def nid(self) -> str:
        return "".join(self.rng.choice(string.ascii_lowercase + string.digits) for _ in range(6))

    def attrs(self, **kv) -> list[dict]:
        """Custom attributes; `data_dialog_open="x"` -> data-dialog-open="x"."""
        return [{"id": self.nid(), "name": k.replace("_", "-"), "value": v} for k, v in kv.items()]

    # ------------------------------------------------------------ CSS registry
    def css(self, name: str, body: str, category: str, optional: bool = False) -> None:
        """optional=True: a shared design-system module may register a whole block; write()
        keeps the entry only when an element (or a used component) carries the class."""
        self.CSS[name] = (category, body.strip())
        if optional:
            self.optional.add(name)
        else:
            self.optional.discard(name)

    # ------------------------------------------------------------ element DSL
    @staticmethod
    def node(name, label, classes, settings=None, children=()):
        return {"name": name, "label": label, "classes": classes.split(), "settings": dict(settings or {}), "children": list(children)}

    def box(self, label, classes, el_tag=None, children=(), **settings):
        """Bricks `div`; el_tag: None/div, a semantic tag (nav, ul, li, p, section…) or a custom one (button, span, i, strong, dialog)."""
        st = dict(settings)
        if el_tag in ("button", "i", "span", "strong", "dialog", "em", "small"):
            st.update(tag="custom", customTag=el_tag)
        elif el_tag:
            st["tag"] = el_tag
        return self.node("div", label, classes, st, children)

    def text(self, label, classes, value, tag="span", **settings):
        """Bricks Basic text."""
        st = {"text": value, **settings}
        if tag in ("span", "strong", "em", "small"):
            st.update(tag="custom", customTag=tag)
        else:
            st["tag"] = tag
        return self.node("text-basic", label, classes, st)

    def link(self, label, classes, value, url, **settings):
        """Bricks Text link."""
        return self.node("text-link", label, classes, {"text": value, "link": self.ext(url), **settings})

    def icon(self, name, classes="icon icon--sm", label=None):
        """Icon from the site's Bricks icon set (Bricks → Icons): a native SVG element whose
        `iconSet` control is pickable in the builder and bindable by an `icon` component
        property. Rendered inline, so `fill="currentColor"` icons follow the text colour.
        Needs `write(..., icons={"set": "<set name>", "dir": "<folder of *.svg>"})`."""
        return self.node("svg", label or f"Icon · {name}", classes,
                         {"source": "iconSet", "iconSet": {"__icon__": name}, "_attributes": self.attrs(aria_hidden="true")})

    def icon_placeholder(self, name, classes="icon icon--sm", label=None):
        """Legacy `<i data-icon>` placeholder swapped by a PHP/JS icon system (not pickable in Bricks)."""
        return self.box(label or f"Icon · {name}", classes, "i", _attributes=self.attrs(data_icon=name))

    @staticmethod
    def ext(url):
        return {"type": "external", "url": url}

    @classmethod
    def a(cls, url):
        """Settings that turn a div into a link: box(..., **S.a("/x/"))."""
        return {"tag": "a", "link": cls.ext(url)}

    # ------------------------------------------------------------ components
    @staticmethod
    def keyed(n, key):
        """Mark a node so a component property can bind to it."""
        n["key"] = key
        return n

    def component(self, label, category, desc, root, props, optional=False):
        """props: [{id, label, type, bind: [(key, controlKey)], default?, multiple?, options?, replace?, desc?}].
        The root is bindable as key "root". Property types: text, link, image, toggle, class, icon,
        editor, select, query (a query-loop root: bind ("root", "query") and give the root
        hasLoop=True; instances pass their own query settings). optional=True: written only
        when an instance in the area uses it (shared modules register whole catalogues)."""
        root.setdefault("key", "root")
        self.COMPONENTS[label] = {"category": category, "desc": desc, "root": root, "props": props, "optional": optional}

    def instance(self, _comp, _title, **values):
        """Instance of a component; values keyed by property id (class values: class names)."""
        root = self.COMPONENTS[_comp]["root"]
        return {"name": root["name"], "label": _title, "classes": [], "settings": {}, "children": [], "component": _comp, "values": values}

    # ------------------------------------------------------------ output
    def _flatten(self, n, parent, into):
        eid = self.nid()
        out = {"id": eid, "name": n["name"], "parent": parent, "children": [], "label": n["label"], "classes": n["classes"], "settings": n["settings"]}
        if "component" in n:
            out.update(component=n["component"], values=n["values"])
        if "key" in n:
            out["key"] = n["key"]
        into.append(out)
        for c in n["children"]:
            out["children"].append(self._flatten(c, eid, into))
        return eid

    def write(self, path, roots, obsolete=(), strip=None, icons=None, scan=(), adopt=()):
        """roots: top-level nodes of the area. obsolete: class names to delete after the save
        (guarded: never deleted while used elsewhere). strip: {sharedClass: [[from, to], …]}
        exact CSS replacements in shared classes (e.g. remove a rule that targeted this area).
        icons: {"set": name, "dir": folder} — the Bricks custom icon set that `icon()` and
        `icon`-type component properties draw from; missing SVGs from `dir` are uploaded.
        scan: folders of PHP/JS that render markup outside Bricks (plugin widgets); an obsolete
        class found there as a word is kept."""
        elements: list[dict] = []
        for r in roots:
            self._flatten(r, 0, elements)

        wanted = {e["component"] for e in elements if "component" in e}
        components = []
        for label, comp in self.COMPONENTS.items():
            if comp.get("optional") and label not in wanted:
                continue
            rows: list[dict] = []
            self._flatten(comp["root"], 0, rows)
            key_to_id = {r.pop("key"): r["id"] for r in rows if "key" in r}
            props = []
            for p in comp["props"]:
                conn: dict[str, list[str]] = {}
                for key, control in p["bind"]:
                    conn.setdefault(key_to_id[key], []).append(control)
                props.append({**{k: v for k, v in p.items() if k != "bind"}, "connections": conn})
            components.append({"label": label, "category": comp["category"], "desc": comp["desc"], "elements": rows, "properties": props})
        for e in elements:
            e.pop("key", None)

        rows = elements + [r for c in components for r in c["elements"]]
        used = {c for e in rows for c in e["classes"]}
        used |= {c for e in elements if "component" in e for c in e["values"].get("classes", [])}
        missing = sorted(used - set(self.CSS) - self.shared)
        if missing:
            raise SystemExit(f"classes without a css() entry (add one, '' for a hook): {missing}")
        unused = sorted(set(self.CSS) - used - self.optional)
        if unused:
            raise SystemExit(f"css() entries no element uses: {unused}")
        clash = sorted(set(obsolete) & (used | set(self.CSS)))
        if clash:
            raise SystemExit(f"obsolete classes still used: {clash}")

        classes = {name: {"category": cat, "css": body.replace("%root%", "." + name)} for name, (cat, body) in self.CSS.items() if name in used}
        spec = {"elements": elements, "components": components, "classes": classes, "obsolete": list(obsolete), "strip": strip or {},
                "icons": {"set": icons["set"], "dir": str(pathlib.Path(icons["dir"]).resolve())} if icons else None,
                "scan": [str(pathlib.Path(d).resolve()) for d in scan], "adopt": list(adopt)}
        uses_icons = '"__icon__"' in json.dumps(elements + components) or any(p["type"] == "icon" for c in components for p in c["properties"])
        if uses_icons and not icons:
            raise SystemExit("icon() / icon properties used: pass write(..., icons={'set': …, 'dir': …})")
        pathlib.Path(path).write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf8")
        print(f"{len(elements)} elements, {len(components)} components, {len(classes)} classes -> {path}")
        return spec
