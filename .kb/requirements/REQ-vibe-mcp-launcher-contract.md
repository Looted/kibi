---
title: 'kibi-vibe MCP launcher contract: full tools in Kibi workspaces, silent zero-tool server outside'
status: open
semantic_text: The kibi-vibe MCP launcher must serve the full kb_* tool list when the resolved workspace owns .kb/manifest.json. Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0. The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process.
semantic_clauses:
  - The kibi-vibe MCP launcher must serve the full kb_* tool list when the resolved workspace owns .kb/manifest.json
  - Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0
  - The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process
semantic_inventory:
  - claim_key: CLAIM-A112F562D2EBB24F
    claim_text: The kibi-vibe MCP launcher must serve the full kb_* tool list when the resolved workspace owns .kb/manifest.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 112
  - claim_key: CLAIM-42905E7D7A18C9C5
    claim_text: Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0
    role: normative
    status: modeled
    span:
      start: 114
      end: 202
  - claim_key: CLAIM-5C25FE3EB4296D35
    claim_text: The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process
    role: normative
    status: modeled
    span:
      start: 204
      end: 290
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 01862ae15164c38e94e9ae3d66e7c364df9d831c991c1e7683669a3b0bcd2bcf
logic_claims:
  - CLAIM-A112F562D2EBB24F
  - CLAIM-42905E7D7A18C9C5
  - CLAIM-5C25FE3EB4296D35
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24: Approved (claim texts as listed).'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:42.283Z'
id: REQ-vibe-mcp-launcher-contract
type: req
firmness: firm
---
The kibi-vibe MCP launcher must serve the full kb_* tool list when the resolved workspace owns .kb/manifest.json. Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0. The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process.

## Context

Requested by the maintainer (2026-11-19) when wiring Kibi MCP into Mistral Vibe Desktop: the kibi-vibe plugin's stdio server is started by packages/vibe/bin/launch-kibi-mcp.mjs, and the host must never show a connection failure outside Kibi projects. Inside a workspace owning .kb/manifest.json the launcher spawns the real server so every kb_* tool answers; outside one it serves a silent zero-tool MCP server and exits 0, and bin/kibi.mjs exits 3 before spawning any CLI route. Source: packages/vibe/bin/launch-kibi-mcp.mjs, packages/vibe/bin/kibi.mjs, packages/vibe/mcp.json.

See the linked scenarios for the executable behavior.

## Source

> Maintainer approval, 2026-11-24: Approved (claim texts as listed).
