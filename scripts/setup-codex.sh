#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

git submodule update --init --recursive

target_path=".codex/root/AGENTS.md"
link_path="AGENTS.md"

if [[ ! -f "$target_path" ]]; then
  echo "Expected private AGENTS file at $target_path after submodule setup." >&2
  exit 1
fi

if [[ -L "$link_path" ]]; then
  current_target="$(readlink "$link_path")"
  if [[ "$current_target" == "$target_path" ]]; then
    echo "AGENTS.md already points to $target_path."
    exit 0
  fi
  rm "$link_path"
elif [[ -e "$link_path" ]]; then
  echo "AGENTS.md already exists and is not a link. Move or delete it, then rerun this script." >&2
  exit 1
fi

if ln -s "$target_path" "$link_path" 2>/dev/null; then
  git update-index --no-skip-worktree AGENTS.md >/dev/null 2>&1 || true
  echo "Created AGENTS.md symbolic link."
elif ln "$target_path" "$link_path" 2>/dev/null; then
  git update-index --skip-worktree AGENTS.md >/dev/null 2>&1 || true
  echo "Created AGENTS.md hard link and marked it skip-worktree locally."
else
  echo "Failed to create AGENTS.md link. Create a symlink or hard link to $target_path manually." >&2
  exit 1
fi
