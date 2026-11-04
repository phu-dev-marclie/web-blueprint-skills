#!/usr/bin/env bash
# Installs every skill in ./skills into ~/.agents/skills and links it into ~/.claude/skills.
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)/skills"
agents="$HOME/.agents/skills"
claude="$HOME/.claude/skills"
mkdir -p "$agents" "$claude"

for dir in "$src"/*/; do
  name="$(basename "$dir")"
  rm -rf "${agents:?}/$name"
  cp -R "$dir" "$agents/$name"

  link="$claude/$name"
  if [ -e "$link" ] && [ ! -L "$link" ]; then
    echo "warning: $link is a real folder; left unchanged (remove it and rerun to link)." >&2
    continue
  fi
  ln -sfn "$agents/$name" "$link"
  echo "installed $name"
done
