#!/bin/bash
set -euo pipefail

if compgen -G "documentation/tests/integration/**/*.test.ts" > /dev/null; then
  bun test "documentation/tests/integration/**/*.test.ts"
elif compgen -G "documentation/tests/integration/**/*.spec.ts" > /dev/null; then
  bun test "documentation/tests/integration/**/*.spec.ts"
else
  echo "No integration test files found; skipping integration step"
fi
