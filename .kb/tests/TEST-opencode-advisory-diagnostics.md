---
id: TEST-opencode-advisory-diagnostics
title: OpenCode advisory diagnostic scheduler tests
status: passing
source: packages/opencode/tests/scheduler.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Validates that OpenCode scheduled checks surface advisory quality diagnostics without treating them as operational failures.
