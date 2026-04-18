---
id: SCEN-mcp-cli-help
title: Consumer runs kibi-mcp help without starting the MCP server
status: active
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
source: documentation/scenarios/SCEN-mcp-cli-help.md
tags:
  - mcp
  - cli
  - help
links:
  - type: verified_by
    target: TEST-mcp-cli-help
---

**Given** the `kibi-mcp` binary is installed and executable
**When** the user runs `kibi-mcp --help`
**Then** the command should exit immediately with code 0
**And** display usage instructions to stdout
**And** must NOT initiate any JSON-RPC or MCP session on stdio.
