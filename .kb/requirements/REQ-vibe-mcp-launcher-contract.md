---
title: 'kibi-vibe MCP launcher contract: full tools in Kibi workspaces, silent zero-tool server outside'
status: open
semantic_text: The kibi-vibe MCP launcher must serve the 16 kb_* tools when the resolved workspace owns .kb/manifest.json. Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0. The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process.
semantic_clauses:
  - The kibi-vibe MCP launcher must serve the 16 kb_* tools when the resolved workspace owns .kb/manifest.json
  - Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0
  - The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process
semantic_inventory:
  - claim_key: CLAIM-90ABBEC6F850F516
    claim_text: The kibi-vibe MCP launcher must serve the 16 kb_* tools when the resolved workspace owns .kb/manifest.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 106
  - claim_key: CLAIM-42905E7D7A18C9C5
    claim_text: Outside Kibi workspaces the launcher must serve a silent zero-tool MCP server and exit 0
    role: normative
    status: modeled
    span:
      start: 108
      end: 196
  - claim_key: CLAIM-5C25FE3EB4296D35
    claim_text: The kibi.mjs CLI wrapper must exit 3 outside Kibi workspaces before spawning a process
    role: normative
    status: modeled
    span:
      start: 198
      end: 284
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c5113cc2894c97307c59b52b9154b8593fad386466f63b489006210895ff2ec9
logic_claims:
  - CLAIM-90ABBEC6F850F516
  - CLAIM-42905E7D7A18C9C5
  - CLAIM-5C25FE3EB4296D35
origin:
  kind: agent
  ref: 'Maintainer review of PR #818, 2026-11-19: the five kibi-vibe requirements state the intended behavior and are approved as written.'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:42.283Z'
id: REQ-vibe-mcp-launcher-contract
type: req
firmness: firm
---
## Context

Requested by the maintainer (2026-11-19) when wiring Kibi MCP into Mistral Vibe Desktop: the kibi-vibe plugin's stdio server is started by packages/vibe/bin/launch-kibi-mcp.mjs, and the host must never show a connection failure outside Kibi projects. Inside a workspace owning .kb/manifest.json the launcher spawns the real server so every kb_* tool answers; outside one it serves a silent zero-tool MCP server and exits 0, and bin/kibi.mjs exits 3 before spawning any CLI route. Source: packages/vibe/bin/launch-kibi-mcp.mjs, packages/vibe/bin/kibi.mjs, packages/vibe/mcp.json.

See the linked scenarios for the executable behavior.