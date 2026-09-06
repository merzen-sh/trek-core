#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

publish_package() {
  local package_dir="$1"
  local skip_build="${2:-false}"

  printf '\nPublishing %s\n' "$package_dir"
  (
    cd "$repo_root/$package_dir"

    if [[ "$skip_build" != "true" ]]; then
      pnpm run build
    else
      printf 'Skipping build for %s\n' "$package_dir"
    fi

    pnpm publish --no-git-checks
  )
}

publish_package "packages/core"
publish_package "packages/ui"
