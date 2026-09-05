---
id: REQ-mcp-cli-help
title: MCP binary exposes deterministic top-level help without entering stdio mode
status: open
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
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
semantic_text: The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text. It must NOT start the MCP stdio server or wait for input when help is requested. This allows users and system administrators to verify the binary installation and inspect usage information without needing an MCP client.
logic_claims:
  - CLAIM-2074E284C8719F99
  - CLAIM-6448FEFEA50A7DCD
  - CLAIM-4A83CC5BE9D362E1
semantic_clauses:
  - The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text
  - It must NOT start the MCP stdio server or wait for input when help is requested
  - This allows users and system administrators to verify the binary installation and inspect usage information without needing an MCP client
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2e7f02c420fc1bd78fecfe4f227934402d936aeb1ef5892670f4959a3cda36a3
semantic_inventory:
  - claim_key: CLAIM-2074E284C8719F99
    claim_text: The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text
    role: normative
    status: modeled
    span:
      start: 0
      end: 126
  - claim_key: CLAIM-6448FEFEA50A7DCD
    claim_text: It must NOT start the MCP stdio server or wait for input when help is requested
    role: normative
    status: modeled
    span:
      start: 128
      end: 207
  - claim_key: CLAIM-4A83CC5BE9D362E1
    claim_text: This allows users and system administrators to verify the binary installation and inspect usage information without needing an MCP client
    role: descriptive
    status: modeled
    span:
      start: 209
      end: 346
type: req
---

The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text. It must NOT start the MCP stdio server or wait for input when help is requested. This allows users and system administrators to verify the binary installation and inspect usage information without needing an MCP client.
