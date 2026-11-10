---
id: REQ-mcp-cli-help
title: MCP binary exposes deterministic top-level help without entering stdio mode
status: open
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
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
semantic_text: The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text. It must NOT start the MCP stdio server or wait for input when help is requested.
logic_claims:
  - CLAIM-2074E284C8719F99
  - CLAIM-6448FEFEA50A7DCD
semantic_clauses:
  - The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text
  - It must NOT start the MCP stdio server or wait for input when help is requested
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a4b4180328f6bef0c5a4c25a73d6414ea20113d9b04028138ece18da0b157476
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
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
rationale: Lets users and system administrators verify the binary installation and inspect usage information without an MCP client.
---

The `kibi-mcp` binary must support standard CLI help flags (`--help`, `-h`) and exit immediately with human-readable help text. It must NOT start the MCP stdio server or wait for input when help is requested. This allows users and system administrators to verify the binary installation and inspect usage information without needing an MCP client.

## Rationale
Lets users and system administrators verify the binary installation and inspect usage information without an MCP client.
