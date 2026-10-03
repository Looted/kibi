---
title: MCP frozen tools contract and CLI/MCP composite parity tests
status: failing
verification_scope: integration
verification_perspective: internal
tags:
  - mcp
  - tool-surface
  - composite-tools
  - parity
id: TEST-kibi-mcp-tool-consolidation
type: test
---
# MCP frozen tools contract and CLI/MCP composite parity tests

Runs `packages/mcp/tests/server/tools-contract-fixture.test.ts` (frozen tools/list contract) and the CLI/MCP parity suites under `packages/cli/tests/parity/` (composite results equal the routed operation payload plus selector; dryRun upsert writes nothing).
