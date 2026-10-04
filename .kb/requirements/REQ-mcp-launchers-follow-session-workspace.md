---
title: Every host MCP launcher follows the session into its current workspace
status: closed
priority: should
tags:
  - mcp
  - worktree
  - launcher
  - search
  - historical-status:superseded
semantic_text: |-
  When the MCP client supports roots, each non-Claude host MCP launcher must answer each tool call from the Kibi workspace that the client roots name.

  When a Kibi workspace environment variable is set, each non-Claude host MCP launcher must not follow the client roots.

  Every host MCP launcher must embed the canonical Kibi session proxy without changes.

  Every host MCP launcher must identify its host to the Kibi MCP server.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ab2ff56c1f89191f74ae9280d3bb34e3ef1802e9c62e9c2310df095303927ee5
semantic_inventory:
  - claim_key: CLAIM-E0C57CF2EAAD51EA
    claim_text: When the MCP client supports roots, each non-Claude host MCP launcher must answer each tool call from the Kibi workspace that the client roots name
    role: condition
    status: modeled
    span:
      start: 0
      end: 147
    payload_hash: 985bbca1113a8a4a6a6936a86c2494a804de4cf53ede699a8b54372d5ff27308
  - claim_key: CLAIM-27758364AADBD9A1
    claim_text: When a Kibi workspace environment variable is set, each non-Claude host MCP launcher must not follow the client roots
    role: condition
    status: modeled
    span:
      start: 150
      end: 267
    payload_hash: 985bbca1113a8a4a6a6936a86c2494a804de4cf53ede699a8b54372d5ff27308
  - claim_key: CLAIM-3C5DBEBD118CD69D
    claim_text: Every host MCP launcher must embed the canonical Kibi session proxy without changes
    role: normative
    status: modeled
    span:
      start: 270
      end: 353
    payload_hash: 985bbca1113a8a4a6a6936a86c2494a804de4cf53ede699a8b54372d5ff27308
  - claim_key: CLAIM-1069C258DAA95AB3
    claim_text: Every host MCP launcher must identify its host to the Kibi MCP server
    role: normative
    status: modeled
    span:
      start: 356
      end: 425
    payload_hash: 985bbca1113a8a4a6a6936a86c2494a804de4cf53ede699a8b54372d5ff27308
logic_claims:
  - CLAIM-E0C57CF2EAAD51EA
  - CLAIM-27758364AADBD9A1
  - CLAIM-3C5DBEBD118CD69D
  - CLAIM-1069C258DAA95AB3
id: REQ-mcp-launchers-follow-session-workspace
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
When the MCP client supports roots, each non-Claude host MCP launcher must answer each tool call from the Kibi workspace that the client roots name.

When a Kibi workspace environment variable is set, each non-Claude host MCP launcher must not follow the client roots.

Every host MCP launcher must embed the canonical Kibi session proxy without changes.

Every host MCP launcher must identify its host to the Kibi MCP server.
