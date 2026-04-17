---
id: REQ-mcp-cli-help
title: MCP binary exposes deterministic top-level help without entering stdio mode
status: open
created_at: 2026-04-17T12:00:00Z
updated_at: 2026-04-17T12:00:00Z
source: documentation/requirements/REQ-mcp-cli-help.md
tags:
  - mcp
  - cli
  - help
links:
  - type: depends_on
    target: REQ-002
  - type: specified_by
    target: SCEN-mcp-cli-help
  - type: verified_by
    target: TEST-mcp-cli-help
---

The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text. It must NOT start the MCP stdio server or wait for input when help is requested. This allows users and system administrators to verify the binary installation and view version information without needing an MCP client.
