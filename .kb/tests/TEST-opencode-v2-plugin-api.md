---
title: kibi-opencode default export satisfies the OpenCode v1 and v2 plugin contracts
status: passing
verification_scope: unit
id: TEST-opencode-v2-plugin-api
type: test
origin:
  kind: human
  ref: github:Looted/kibi#509
  recorded_at: '2026-10-19T19:00:00.000Z'
tags:
  - opencode
  - plugin-api
---
Covered by `packages/opencode/tests/opencode-v2.test.ts` (definition shape, v2 setup bridging of context, tool, and command hooks, failure isolation and reporting, cleanup) and `packages/opencode/tests/tui.coverage.test.ts` (TUI entry exposes `setup` for OpenCode v2).
