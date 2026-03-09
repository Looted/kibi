#!/bin/sh
# Staged Symbol Traceability Check
# Thin wrapper around 'kibi check --staged' for pre-commit framework

set -e

# Parse arguments
DRY_RUN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Run kibi staged check
exec kibi check --staged ${DRY_RUN}
