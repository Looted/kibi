---
id: TEST-mcp-cli-help
title: kibi-mcp help exits cleanly in workspace and packed installs
status: active
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
source: documentation/tests/TEST-mcp-cli-help.md
tags:
  - mcp
  - cli
  - regression
links:
  - type: validates
    target: SCEN-mcp-cli-help
---

The test verifies that the `kibi-mcp` binary correctly handles help requests without entering an interactive loop.

**Coverage:**
- Verified in `packages/mcp/tests/cli-help.test.ts`
- Verifies that help flags (`--help`, `-h`) result in exit code 0
- Verifies that usage information is output to the console
- Verifies that the process terminates automatically.
