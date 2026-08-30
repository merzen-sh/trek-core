#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

publish_package() {
  local package_dir="$1"

  printf '\nPublishing %s\n' "$package_dir"
  (
    cd "$repo_root/$package_dir"
    pnpm run build
    pnpm publish --no-git-check
  )
}

publish_package "packages/core"
publish_package "packages/ui"
