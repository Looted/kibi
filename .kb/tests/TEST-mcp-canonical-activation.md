---
title: Bootstrap discovery uses manifest.json and canonical .kb lanes
status: passing
tags:
  - mcp
  - canonical-layout
verification_scope: unit
verification_perspective: internal
text_ref: packages/cli/tests/operations/bootstrap-discovery.test.ts
id: TEST-mcp-canonical-activation
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Unit coverage verifies bootstrap discovery reads manifest.json and canonical .kb lanes, honors ignore rules, reports activation posture and evidence, and uses the shared CLI/runtime planner.
