---
title: MCP session state, attachment and shutdown lifecycle integration
status: passing
verification_scope: integration
verification_perspective: internal
tags:
  - test-quality
  - regression
  - internal
id: TEST-mcp-session-state
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Runs packages/mcp/tests/server/session.test.ts. Exercises session getters, worker reset, branch attachment and graceful shutdown using isolated session fixtures. Internal integration evidence, not editor-host end-to-end evidence.