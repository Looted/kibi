#!/bin/bash
# Selectively publish packages with newer versions than npm registry.
# Package names come from scripts/package-catalog.ts.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

lookup_package() {
  local query="$1"
  bun scripts/package-catalog.ts --lookup "$query"
}

check_and_publish() {
  local pkg_name="$1"
  local pkg_dir="$2"
  shift 2
  local version
  version="$(node -p "require('./packages/${pkg_dir}/package.json').version")"

  echo "Checking ${pkg_name} local version: ${version}"

  if npm view "${pkg_name}@${version}" version > /dev/null 2>&1; then
    echo "${pkg_name}@${version} already exists on npm - skipping"
    return 0
  fi
  echo "Publishing ${pkg_name}@${version}..."
  (cd "packages/${pkg_dir}" && npm publish "$@")
}

if [ -n "${1:-}" ]; then
  IFS=',' read -ra PACKAGES <<< "$1"
  extra_flags=("${@:2}")
  for pkg in "${PACKAGES[@]}"; do
    pkg="$(echo "$pkg" | xargs)"
    if [ "$pkg" = "vscode" ]; then
      echo "kibi-vscode is published to VS Code Marketplace, not npm"
      continue
    fi
    if ! row="$(lookup_package "$pkg")"; then
      echo "Unknown package: $pkg"
      continue
    fi
    dir="${row%%$'\t'*}"
    name="${row#*$'\t'}"
    check_and_publish "$name" "$dir" "${extra_flags[@]}"
  done
else
  extra_flags=("${@:1}")
  while IFS=$'\t' read -r dir name; do
    [ -n "$dir" ] || continue
    check_and_publish "$name" "$dir" "${extra_flags[@]}"
  done < <(bun scripts/package-catalog.ts --print-publishable-tsv)
fi
