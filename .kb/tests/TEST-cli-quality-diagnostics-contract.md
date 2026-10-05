---
id: TEST-cli-quality-diagnostics-contract
title: CLI quality diagnostics contract tests
status: passing
source: packages/cli/tests/commands/check-impact-contract.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Validates CLI impact and quality diagnostic contracts, including blocking semantics and advisory diagnostic lanes.
