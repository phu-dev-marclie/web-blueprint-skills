"""Run a command while holding a project-wide lock, so parallel workers never write Bricks'
global options (classes, components, variables) at the same time.

    python locked.py <lock-dir> -- studio wp eval-file …/bricks_apply.php spec.json 268 ../.tools/bricks-backup

The lock is a directory (atomic mkdir on every OS); a lock older than --stale seconds is taken over.
Exit code = the command's exit code.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("lock")
    ap.add_argument("--stale", type=int, default=900)
    ap.add_argument("--wait", type=int, default=3600)
    ap.add_argument("cmd", nargs=argparse.REMAINDER)
    a = ap.parse_args()
    cmd = a.cmd[1:] if a.cmd[:1] == ["--"] else a.cmd
    if not cmd:
        ap.error("command missing after --")
    start = time.time()
    while True:
        try:
            os.mkdir(a.lock)
            break
        except FileExistsError:
            age = time.time() - os.path.getmtime(a.lock)
            if age > a.stale:
                shutil.rmtree(a.lock, ignore_errors=True)
                continue
            if time.time() - start > a.wait:
                print(f"lock {a.lock} still held after {a.wait}s", file=sys.stderr)
                return 2
            time.sleep(2)
    try:
        with open(os.path.join(a.lock, "owner"), "w", encoding="utf8") as f:
            f.write(f"{os.getpid()} {' '.join(cmd)}\n")
        return subprocess.call(cmd, shell=(os.name == "nt"))
    finally:
        shutil.rmtree(a.lock, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
