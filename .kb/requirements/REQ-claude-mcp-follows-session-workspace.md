---
title: Claude MCP launcher follows the session into its current workspace
status: closed
priority: should
tags:
  - claude
  - mcp
  - worktree
  - search
  - historical-status:superseded
semantic_text: |-
  When the MCP client supports roots, the kibi-claude MCP launcher must read the client roots before each tool call.

  When the client roots name a different Kibi workspace, the kibi-claude MCP launcher must answer the tool call from that workspace.

  When the kibi-claude MCP launcher changes workspace, it must notify the client that the tool list changed.

  When a Kibi workspace environment variable is set, the kibi-claude MCP launcher must not follow the client roots.

  When the roots query fails or the new workspace server cannot start, the kibi-claude MCP launcher must keep answering from the current workspace.

  The kibi-claude MCP launcher must preserve the order of client messages across a workspace change.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 669e63c5c0d0d6c5e84277634c2814c8a293f1088ef27cfcaff657be11d688e7
semantic_inventory:
  - claim_key: CLAIM-00B35D3005D46EDD
    claim_text: When the MCP client supports roots, the kibi-claude MCP launcher must read the client roots before each tool call
    role: condition
    status: modeled
    span:
      start: 0
      end: 113
    payload_hash: abe4ab271039705bdb030cd7ad53e0fcdf1632840a63cb79c73d193e52b16aa9
  - claim_key: CLAIM-30D2679B0BBA42EB
    claim_text: When the client roots name a different Kibi workspace, the kibi-claude MCP launcher must answer the tool call from that workspace
    role: condition
    status: modeled
    span:
      start: 116
      end: 245
    payload_hash: abe4ab271039705bdb030cd7ad53e0fcdf1632840a63cb79c73d193e52b16aa9
  - claim_key: CLAIM-ACF117B9E90D97FB
    claim_text: When the kibi-claude MCP launcher changes workspace, it must notify the client that the tool list changed
    role: condition
    status: modeled
    span:
      start: 248
      end: 353
    payload_hash: abe4ab271039705bdb030cd7ad53e0fcdf1632840a63cb79c73d193e52b16aa9
  - claim_key: CLAIM-B8C0003B285310DE
    claim_text: When a Kibi workspace environment variable is set, the kibi-claude MCP launcher must not follow the client roots
    role: condition
    status: modeled
    span:
      start: 356
      end: 468
    payload_hash: abe4ab271039705bdb030cd7ad53e0fcdf1632840a63cb79c73d193e52b16aa9
  - claim_key: CLAIM-7340EAFAA796212F
    claim_text: When the roots query fails or the new workspace server cannot start, the kibi-claude MCP launcher must keep answering from the current workspace
    role: condition
    status: modeled
    span:
      start: 471
      end: 615
    payload_hash: abe4ab271039705bdb030cd7ad53e0fcdf1632840a63cb79c73d193e52b16aa9
  - claim_key: CLAIM-435A512436172461
    claim_text: The kibi-claude MCP launcher must preserve the order of client messages across a workspace change
    role: normative
    status: modeled
    span:
      start: 618
      end: 715
    payload_hash: abe4ab271039705bdb030cd7ad53e0fcdf1632840a63cb79c73d193e52b16aa9
logic_claims:
  - CLAIM-00B35D3005D46EDD
  - CLAIM-30D2679B0BBA42EB
  - CLAIM-ACF117B9E90D97FB
  - CLAIM-B8C0003B285310DE
  - CLAIM-7340EAFAA796212F
  - CLAIM-435A512436172461
id: REQ-claude-mcp-follows-session-workspace
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
When the MCP client supports roots, the kibi-claude MCP launcher must read the client roots before each tool call.

When the client roots name a different Kibi workspace, the kibi-claude MCP launcher must answer the tool call from that workspace.

When the kibi-claude MCP launcher changes workspace, it must notify the client that the tool list changed.

When a Kibi workspace environment variable is set, the kibi-claude MCP launcher must not follow the client roots.

When the roots query fails or the new workspace server cannot start, the kibi-claude MCP launcher must keep answering from the current workspace.

The kibi-claude MCP launcher must preserve the order of client messages across a workspace change.
