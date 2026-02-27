#!/bin/bash
# Selectively publish packages with newer versions than npm registry

set -e

# Function to check and publish a package
check_and_publish() {
  local pkg_name="$1"
  local pkg_dir="$2"
  local version=$(node -p "require('./${pkg_dir}/package.json').version")

  echo "Checking ${pkg_name} local version: ${version}"

  # Check npm registry
  if npm view ${pkg_name}@${version} version > /dev/null 2>&1; then
    echo "${pkg_name}@${version} already exists on npm - skipping"
    return 1
  else
    echo "Publishing ${pkg_name}@${version}..."
    cd packages/${pkg_dir} && npm publish "$@" && cd ../..
    return 0
  fi
}

# If packages are specified, only publish those
if [ -n "$1" ]; then
  IFS=',' read -ra PACKAGES <<< "$1"
  for pkg in "${PACKAGES[@]}"; do
    pkg=$(echo $pkg | xargs)  # trim whitespace
    case $pkg in
      core) check_and_publish "kibi-core" "core" "${@:2}" ;;
      cli) check_and_publish "kibi-cli" "cli" "${@:2}" ;;
      mcp) check_and_publish "kibi-mcp" "mcp" "${@:2}" ;;
      vscode) echo "kibi-vscode is published to VS Code Marketplace, not npm" ;;
      *) echo "Unknown package: $pkg" ;;
    esac
  done
else
  # Auto-detect: check all packages
  check_and_publish "kibi-core" "core" "${@:2}"
  check_and_publish "kibi-cli" "cli" "${@:2}"
  check_and_publish "kibi-mcp" "mcp" "${@:2}"
fi
