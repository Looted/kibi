---
title: A client that cannot start a writer engine fails with an actionable error
status: active
expects: error
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:37.107Z'
id: SCEN-CASE-core-journaled-engine-persistence-NO-WRITER
type: scenario
---
Given a workspace whose configured Node host does not exist, so no writer engine can run for it, when an engine client starts, then the start fails with an error that Kibi requires Node.js 18 or later instead of serving the workspace without a writer.

This covers the edge case of zero writer engines, the value below the bound `lt 1`. packages/cli/tests/engine.test.ts "reports an actionable error when Node is unavailable" exercises it by pointing KIBI_NODE_PATH at a missing executable.
