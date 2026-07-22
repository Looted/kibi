#!/bin/sh

set -u

workspaceRoot=$(git rev-parse --show-toplevel 2>/dev/null) || {
  printf '%s\n' "kibi-mcp resolver: workspace rejected: not inside a git checkout" >&2
  exit 1
}
commonDir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || {
  printf '%s\n' "kibi-mcp resolver: workspace rejected: git common directory is unavailable" >&2
  exit 1
}
primaryRoot=${commonDir%/*}

if command -v bun >/dev/null 2>&1; then
  runtimeExecutable=bun
elif command -v node >/dev/null 2>&1; then
  runtimeExecutable=node
else
  runtimeExecutable=
fi

if command -v swipl >/dev/null 2>&1; then
  prologAvailable=true
else
  prologAvailable=false
fi

rejectionReason=

package_version() {
  sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1"
}

validate_candidate() {
  candidateLabel=$1
  candidateRoot=$2
  candidateBin="$candidateRoot/packages/mcp/bin/kibi-mcp"
  candidateDist="$candidateRoot/packages/mcp/dist"

  if [ ! -f "$candidateBin" ]; then
    rejectionReason="$candidateLabel rejected: missing MCP bin at $candidateBin"
    return 1
  fi
  if [ ! -d "$candidateDist" ]; then
    rejectionReason="$candidateLabel rejected: missing MCP dist at $candidateDist"
    return 1
  fi
  if [ -z "$runtimeExecutable" ]; then
    rejectionReason="$candidateLabel rejected: neither bun nor node is available"
    return 1
  fi
  if [ "$prologAvailable" != true ]; then
    rejectionReason="$candidateLabel rejected: SWI-Prolog executable swipl is unavailable"
    return 1
  fi

  for packageName in core cli mcp; do
    workspacePackage="$workspaceRoot/packages/$packageName/package.json"
    runtimePackage="$candidateRoot/packages/$packageName/package.json"
    if [ ! -f "$workspacePackage" ]; then
      rejectionReason="$candidateLabel rejected: missing workspace package metadata for $packageName"
      return 1
    fi
    if [ ! -f "$runtimePackage" ]; then
      rejectionReason="$candidateLabel rejected: missing runtime package metadata for $packageName"
      return 1
    fi
    workspaceVersion=$(package_version "$workspacePackage")
    runtimeVersion=$(package_version "$runtimePackage")
    if [ -z "$workspaceVersion" ] || [ -z "$runtimeVersion" ]; then
      rejectionReason="$candidateLabel rejected: unreadable package version for $packageName"
      return 1
    fi
    if [ "$workspaceVersion" != "$runtimeVersion" ]; then
      rejectionReason="$candidateLabel rejected: package version mismatch for $packageName (workspace $workspaceVersion, runtime $runtimeVersion)"
      return 1
    fi
  done

  runtimeRoot=$candidateRoot
  mcpBin=$candidateBin
  return 0
}

if validate_candidate local "$workspaceRoot"; then
  :
else
  localRejection=$rejectionReason
  if [ "$primaryRoot" = "$workspaceRoot" ]; then
    primaryRejection="primary rejected: same checkout as workspace"
    runtimeRoot=
  elif validate_candidate primary "$primaryRoot"; then
    localRejection=
  else
    primaryRejection=$rejectionReason
    runtimeRoot=
  fi

  if [ -z "${runtimeRoot:-}" ]; then
    printf 'kibi-mcp resolver: %s\n' "$localRejection" >&2
    printf 'kibi-mcp resolver: %s\n' "$primaryRejection" >&2
    printf '%s\n' "kibi-mcp resolver: no trusted built MCP runtime is available" >&2
    exit 1
  fi
fi

cd "$runtimeRoot" || {
  printf 'kibi-mcp resolver: selected runtime root is inaccessible: %s\n' "$runtimeRoot" >&2
  exit 1
}
KIBI_WORKSPACE=$workspaceRoot
export KIBI_WORKSPACE

if [ "$runtimeExecutable" = bun ]; then
  exec bun run "$mcpBin" --diagnostic-mode
fi
exec node "$mcpBin" --diagnostic-mode
