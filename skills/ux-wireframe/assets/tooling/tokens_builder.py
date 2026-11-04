"""Design tokens → Bricks Style Manager (tokens.json for bricks_tokens_apply.php) + the CSS Bricks prints.

System (learned from Core Framework, built on Bricks' own theme management — references/tokens.md):

    from tokens_builder import Tokens
    T = Tokens()
    T.style_manager(htmlFontSize="62.5%", minScreenWidth=320, maxScreenWidth=1440, defaultMode="auto")
    T.breakpoints([("laptop", "Laptop", 1279, True), ("tablet_portrait", "Tablet portrait", 991, False), ...])
    T.brand("Brand", [("primary", "#E0174F", {"light": 4, "dark": 4}), ...])     # Bricks "Color shades" maths
    T.neutrals("Neutrals")                                                        # --light/--dark flip, --all-* fixed
    T.palette("Theme", [("bg-body", "#FFFFFF", "#121214"), ("text-eyebrow", "#6E6E73", "#A1A1A6"), ...])
    T.ratio_scale("txt", "Font sizes", "typography", "text-", ["xs", "s", "m", ..., "6xl"], "m", (16, 16), (1.125, 1.2))
    T.ratio_scale("spc", "Spacing", "spacing", "space-", ["3xs", ..., "5xl"], "m", (16, 16), (1.414, 1.414))
    T.category("lh", "Line heights", [("line-height-xs", "1"), ...])
    T.category("lay", "Layout", [("layout-margin", T.fluid(16, 72)), ...])
    T.theme_style('html { font-size: 62.5%; }\\n:root[data-brx-theme="dark"] { --shadow-m: …; }')
    T.write("handoff/bricks-tokens.json", css="assets/tokens.css")

Order of calls = order in the Style Manager (palettes, categories, variables).
`ratio_scale()` and `fluid()` port Abilities\\Design::build_scale_variable and `brand()` ports the
shade path of Abilities\\Color (bricks/generate-color-shades), so values equal what Bricks generates;
check with `bricks_tokens_verify.php`. `scale()` keeps hand-picked step values (manual scale).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_PX = re.compile(r"^(-?\d+(?:\.\d+)?)px$")
_CLAMP = re.compile(r"^clamp\(\s*(-?\d+(?:\.\d+)?)px\s*,.*,\s*(-?\d+(?:\.\d+)?)px\s*\)$")
_VAR = re.compile(r"var\(--([\w-]+)\)")
NEUTRAL_STEPS = (5, 10, 20, 30, 40, 50, 60, 70, 80, 90)


def _num(x: float) -> str:
    return f"{x:g}px"


def min_max(value: str) -> tuple[str, str]:
    """`16px` → (16px, 16px); `clamp(30px, … , 48px)` → (30px, 48px)."""
    v = value.strip()
    if m := _PX.match(v):
        return _num(float(m[1])), _num(float(m[1]))
    if m := _CLAMP.match(v):
        return _num(float(m[1])), _num(float(m[2]))
    raise ValueError(f"scale value must be px or clamp(px, …, px): {value!r}")


# ------------------------------------------------------------------ Bricks maths (PHP ports)
def fmt_num(n: float) -> str:
    """Abilities\\Design::fmt_num — integers without a point, else up to 10 decimals, trailing zeros cut."""
    if float(n) == int(n):
        return str(int(n))
    return f"{n:.10f}".rstrip("0").rstrip(".")


def php_round(x: float, digits: int = 0) -> float:
    """PHP round(): half away from zero (Python's round() rounds half to even)."""
    q = 10 ** digits
    return (int(abs(x) * q + 0.5 + 1e-9) / q) * (1 if x >= 0 else -1)


def html_px(value: str) -> float:
    """Style Manager htmlFontSize → px, like Design::parse_html_font_size_to_px (16px browser base)."""
    v = str(value).strip().lower()
    for suffix, k in (("px", 1.0), ("rem", 16.0), ("%", 0.16)):
        if v.endswith(suffix):
            return float(v[: -len(suffix)]) * k
    raise ValueError(f"htmlFontSize must be px, rem or %: {value!r}")


def mix(c1: tuple, c2: tuple, percentage: float) -> tuple[int, int, int]:
    """Abilities\\Color::mix: c1 + (c2 - c1) * p."""
    p = max(0.0, min(100.0, percentage)) / 100.0
    return tuple(int(php_round(a + (b - a) * p)) for a, b in zip(c1, c2))


def shade_values(base_hex: str, kind: str, steps: int) -> list[str]:
    """Bricks "Color shades": -1 … -N, light mixes towards white, dark towards black (PopupColorShades.vue)."""
    h = base_hex.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"brand colours are 6-digit hex: {base_hex!r}")
    base = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    target = (255, 255, 255) if kind == "light" else (0, 0, 0)
    return ["#{:02x}{:02x}{:02x}".format(*mix(target, base, (100 / (steps + 1)) * (steps - i))) for i in range(steps)]


class Tokens:
    def __init__(self) -> None:
        self.palettes: list[dict] = []
        self.categories: list[dict] = []
        self.variables: list[dict] = []
        self.sm: dict = {}
        self.drop: list[str] = []
        self.bps: list[dict] = []
        self.theme_css: str = ""

    # -------------------------------------------------------------- settings
    def style_manager(self, **settings) -> None:
        self.sm.update(settings)

    def breakpoints(self, rows: list[tuple]) -> None:
        """(key, label, max-width px, custom?) desktop-first; recorded for the agent (Bricks › Settings › Breakpoints)."""
        self.bps = [{"key": k, "label": lab, "width": w, "custom": bool(c)} for k, lab, w, c in rows]

    def theme_style(self, css: str) -> None:
        """Theme-style CSS: root font size and dark overrides of non-colour variables (variables have no dark value)."""
        self.theme_css = css.strip() + "\n"

    def _range(self) -> tuple[float, float, float]:
        try:
            return html_px(self.sm["htmlFontSize"]), float(self.sm["minScreenWidth"]), float(self.sm["maxScreenWidth"])
        except KeyError as e:
            raise ValueError(f"call style_manager({e.args[0]}=…) before fluid() / ratio_scale()") from None

    def fluid(self, min_px: float, max_px: float) -> str:
        """One fluid value in Bricks' scale format (rem at htmlFontSize, min → max over the screen range)."""
        h, w0, w1 = self._range()
        mn, mx = php_round(min_px / h, 2), php_round(max_px / h, 2)
        r0, r1 = php_round(w0 / h, 2), php_round(w1 / h, 2)
        slope = (mx - mn) / (r1 - r0)
        return (f"clamp({fmt_num(mn)}rem, calc({fmt_num(slope)} * (100vw - {fmt_num(r0)}rem) + "
                f"{fmt_num(mn)}rem), {fmt_num(mx)}rem)")

    # -------------------------------------------------------------- colours
    def palette(self, name: str, colors: list[tuple], pid: str | None = None) -> None:
        """colors: (name, light) or (name, light, dark|None)."""
        rows = []
        for c in colors:
            row = {"name": c[0], "light": c[1]}
            if len(c) > 2 and c[2]:
                row["dark"] = c[2]
            rows.append(row)
        p = {"name": name, "colors": rows}
        if pid:
            p["id"] = pid
        self.palettes.append(p)

    def brand(self, name: str, colors: list[tuple], pid: str | None = None) -> None:
        """(name, #hex[, {"light": n, "dark": n}]) → base colour + Bricks shades name-l-1…n / name-d-1…n."""
        rows = []
        for c in colors:
            cname, value, cfg = c[0], c[1], (c[2] if len(c) > 2 else {})
            rows.append({"name": cname, "light": value})
            for kind, letter in (("light", "l"), ("dark", "d")):
                for i, v in enumerate(shade_values(value, kind, cfg.get(kind, 0))):
                    rows.append({"name": f"{cname}-{letter}-{i + 1}", "light": v,
                                 "shade": {"type": kind, "parent": cname, "index": i}})
        p = {"name": name, "colors": rows}
        if pid:
            p["id"] = pid
        self.palettes.append(p)

    def neutrals(self, name: str, steps: tuple = NEUTRAL_STEPS, pid: str | None = None) -> None:
        """Core Framework ramps: --light / --dark (+ -N alpha) swap in dark mode; --all-light / --all-dark never do."""
        rows = []
        for base, rgb, dark in (("light", "255, 255, 255", "0, 0, 0"), ("dark", "0, 0, 0", "255, 255, 255"),
                                ("all-light", "255, 255, 255", None), ("all-dark", "0, 0, 0", None)):
            rows.append({"name": base, "light": f"rgb({rgb})", **({"dark": f"rgb({dark})"} if dark else {})})
            for s in steps:
                a = fmt_num(s / 100)
                rows.append({"name": f"{base}-{s}", "light": f"rgba({rgb}, {a})",
                             **({"dark": f"rgba({dark}, {a})"} if dark else {})})
        p = {"name": name, "colors": rows}
        if pid:
            p["id"] = pid
        self.palettes.append(p)

    # -------------------------------------------------------------- variables
    def category(self, cid: str, name: str, variables: list[tuple[str, str]]) -> None:
        self.categories.append({"id": cid, "name": name})
        self.variables += [{"name": n, "value": v, "category": cid} for n, v in variables]

    def scale(self, cid: str, name: str, scope: str, prefix: str, steps: list[tuple[str, str]],
              baseline: str, scale_type: str = "custom") -> None:
        """A manual Style Manager scale (scope 'typography' | 'spacing'), steps ascending: (step, value)."""
        names = [s for s, _ in steps]
        if baseline not in names:
            raise ValueError(f"{name}: baseline {baseline!r} not in steps")
        if scale_type == "numeric" and any(int(n) - int(baseline) != i - names.index(baseline) for i, n in enumerate(names)):
            raise ValueError(f"{name}: numeric steps must be consecutive integers")
        manual = [dict(zip(("min", "max"), min_max(v))) for _, v in steps]
        base_px = float(manual[names.index(baseline)]["min"][:-2])
        self.categories.append({"id": cid, "name": name, "scale": {
            "scaleScope": scope, "scaleType": scale_type, "scaleNames": names, "prefix": prefix,
            "baseline": baseline, "isManual": True, "manualValues": manual,
            "minFontSize": base_px, "maxFontSize": base_px,
            "minScaleRatio": 1.25, "minScaleRatioSelect": 1.25, "maxScaleRatio": 1.333, "maxScaleRatioSelect": 1.333,
        }})
        b = names.index(baseline)
        self.variables += [{"name": prefix + n, "value": v, "category": cid,
                            "scale": {"scale": i - b, "scaleName": n}} for i, (n, v) in enumerate(steps)]

    def ratio_scale(self, cid: str, name: str, scope: str, prefix: str, names: list[str], baseline: str,
                    base: tuple[float, float], ratio: tuple[float, float], scale_type: str = "tshirt") -> None:
        """A generated Style Manager scale: base size and ratio at min / max screen; step n = base × ratio^n.
        Same config and values as Style Manager › Typography / Spacing › Generate variables."""
        if baseline not in names:
            raise ValueError(f"{name}: baseline {baseline!r} not in steps")
        self.categories.append({"id": cid, "name": name, "scale": {
            "scaleScope": scope, "scaleType": scale_type, "scaleNames": names, "prefix": prefix,
            "baseline": baseline, "isManual": False, "minFontSize": base[0], "maxFontSize": base[1],
            "minScaleRatio": ratio[0], "minScaleRatioSelect": "custom",
            "maxScaleRatio": ratio[1], "maxScaleRatioSelect": "custom",
        }})
        b = names.index(baseline)
        for i, step_name in enumerate(names):
            step = i - b
            lo, hi = float(base[0]), float(base[1])
            for _ in range(abs(step)):
                lo, hi = (lo * ratio[0], hi * ratio[1]) if step > 0 else (lo / ratio[0], hi / ratio[1])
            self.variables.append({"name": prefix + step_name, "value": self.fluid(lo, hi), "category": cid,
                                   "scale": {"scale": step, "scaleName": step_name}})

    # -------------------------------------------------------------- output
    def css(self) -> str:
        """The CSS Bricks prints for this token set: Color Manager (light :root, dark :root[data-brx-theme="dark"]),
        global variables, theme style. A mockup loads it first so its pages render exactly like the Bricks site."""
        light = [f"  --{c['name']}: {c['light']};" for p in self.palettes for c in p["colors"]]
        dark = [f"  --{c['name']}: {c['dark']};" for p in self.palettes for c in p["colors"] if c.get("dark")]
        variables = [f"  --{v['name']}: {v['value']};" for v in self.variables]
        out = ["/* GENERATED by tokens_builder.py — do not edit; change the token spec and rerun it. */", "",
               "/* Color Manager */", ":root {", *light, "}"]
        if dark:
            out += [':root[data-brx-theme="dark"] {', *dark, "}"]
        out += ["", "/* Global variables */", ":root {", *variables, "}"]
        if self.theme_css:
            out += ["", "/* Theme style */", self.theme_css.rstrip()]
        return "\n".join(out) + "\n"

    def write(self, path: str | Path, css: str | Path | None = None) -> Path:
        names = [c["name"] for p in self.palettes for c in p["colors"]] + [v["name"] for v in self.variables]
        dupes = sorted({n for n in names if names.count(n) > 1})
        if dupes:
            raise ValueError(f"duplicate token names: {dupes}")
        defined = set(names)
        values = [c.get(k, "") for p in self.palettes for c in p["colors"] for k in ("light", "dark")] + \
                 [v["value"] for v in self.variables] + [self.theme_css]
        missing = sorted({r for v in values for r in _VAR.findall(v) if r not in defined})
        if missing:
            raise ValueError(f"tokens reference undefined names: {missing}")
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        data = {"palettes": self.palettes, "categories": self.categories, "variables": self.variables,
                "styleManager": self.sm, "drop": self.drop}
        if self.bps:
            data["breakpoints"] = self.bps
        if self.theme_css:
            data["themeStyleCss"] = self.theme_css
        out.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        msg = (f"{out}: {len(self.palettes)} palettes / {sum(len(p['colors']) for p in self.palettes)} colors, "
               f"{len(self.categories)} categories / {len(self.variables)} variables")
        if css:
            Path(css).parent.mkdir(parents=True, exist_ok=True)
            Path(css).write_text(self.css(), encoding="utf-8")
            msg += f" · {css}"
        print(msg)
        return out
