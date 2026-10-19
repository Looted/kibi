---
title: 'Regression: coordinate refresh and upsert reject outside-workspace sourceFile'
status: passing
tags:
  - security
  - symbols
  - coordinates
verification_scope: unit
id: TEST-symbol-sourcefile-workspace-confinement
type: test
---
# Regression: coordinate refresh and upsert reject outside-workspace sourceFile

Covered by:
- `packages/cli/tests/utils/repo-relative-path.test.ts`
- `packages/cli/tests/operations/mutation-validation.test.ts`
- `packages/cli/tests/operations/symbol-refresh.test.ts` (escape case)
- `packages/mcp/tests/tools/symbols.test.ts` (escape case)
- `packages/mcp/tests/workspace-path.test.ts`

## Context

Unit regressions for the workspace path-confinement fix: resolver null on escapes, upsert rejection of absolute/`..` sourceFile, and refresh that publishes no outside-file coordinates.
