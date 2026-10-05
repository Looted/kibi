---
title: Detached HEAD checkouts read from a snapshot store and refuse writes through the CLI and MCP
status: passing
tags:
  - git
  - branching
  - detached-head
  - read-only
  - mcp
  - cli
verification_scope: integration
verification_perspective: consumer
text_ref: packages/cli/tests/commands/detached-head.test.ts; packages/mcp/tests/detached-head-read-only.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:17:43.813Z'
id: TEST-branch-detached-head-read-only
type: test
---
# Detached HEAD checkouts read from a snapshot store and refuse writes through the CLI and MCP

Runs `packages/cli/tests/commands/detached-head.test.ts` (answers read from the checkout's snapshot and writes are refused when no branch points at HEAD; two branches at HEAD are not chosen between; a CI-style shallow checkout of a SHA is served) and `packages/mcp/tests/detached-head-read-only.test.ts` (the MCP server reads a bare-SHA checkout from its read-only snapshot, reports `detached_head_read_only` and refuses writes).
