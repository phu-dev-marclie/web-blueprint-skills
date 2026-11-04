"""Rename design tokens (CSS custom properties) in files — the file side of bricks_token_rename.php.

    python token_rename.py <map.json> <path> [<path> …] [--dry] [--ext .css .php .js .py .json .md .html]

map.json: {"old-name": "new-name"} without `--`. Only whole names are renamed
(`(?<![\\w-])--name(?![\\w-])`), all in ONE pass, so chains (colour `text-body`→`color-text-body`
while `fs-body`→`text-body`) stay correct. Folders: vendor/, node_modules/, .git/ and *.min.* are
skipped. --dry prints per-file counts and every distinct context that would change, without writing.
A flag-like token in code (`--margin` as a CLI option) would also match: review the dry run.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

SKIP_DIRS = {"vendor", "node_modules", ".git", "__pycache__"}
TOKEN = re.compile(r"(?<![\w-])--([a-zA-Z][\w-]*)")


def files(paths, exts):
    for p in map(pathlib.Path, paths):
        if p.is_file():
            yield p
            continue
        for f in p.rglob("*"):
            if f.is_file() and f.suffix in exts and not (SKIP_DIRS & set(f.parts)) and ".min." not in f.name:
                yield f


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("map")
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--ext", nargs="+", default=[".css", ".php", ".js", ".mjs", ".py", ".json", ".md", ".html", ".txt"])
    a = ap.parse_args()
    mp = json.loads(pathlib.Path(a.map).read_text(encoding="utf8"))
    total, contexts = 0, {}
    for f in files(a.paths, set(a.ext)):
        try:
            src = f.read_text(encoding="utf8")
        except UnicodeDecodeError:
            continue
        n = 0

        def sub(m):
            nonlocal n
            new = mp.get(m.group(1))
            if new is None:
                return m.group(0)
            n += 1
            line = src[src.rfind("\n", 0, m.start()) + 1: src.find("\n", m.end())].strip()
            contexts.setdefault(m.group(1), set()).add(f"{f.suffix}: {line[:90]}")
            return "--" + new

        out = TOKEN.sub(sub, src)
        if n:
            total += n
            print(f"{n:5d}  {f}")
            if not a.dry:
                f.write_text(out, encoding="utf8", newline="")
    print(f"{total} references {'would change' if a.dry else 'renamed'}")
    if a.dry:
        # names that look like CLI flags or prose are worth a look
        for name in sorted(contexts):
            if any(not re.search(r"var\(--|--[\w-]+\s*:", c) for c in contexts[name]):
                print(f"  check --{name}: " + " | ".join(sorted(c for c in contexts[name] if not re.search(r"var\(--|--[\w-]+\s*:", c))[:3]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
