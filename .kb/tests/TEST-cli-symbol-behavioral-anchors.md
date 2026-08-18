---
id: TEST-cli-symbol-behavioral-anchors
title: CLI staged checks enforce behavioral symbol granularity
status: passing
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-06T00:00:00Z
source: packages/cli/tests/commands/check-staged-enforcement.test.ts
tags: [cli, symbols, traceability, unit]
links:
  - type: validates
    target: SCEN-symbol-behavioral-anchors
---

Verifies that staged symbol granularity diagnostics reject coarse links only when narrower behavioral symbols are available and ignore interface/type-only symbols as blockers.
