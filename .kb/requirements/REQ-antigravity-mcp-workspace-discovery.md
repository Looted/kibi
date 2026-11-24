---
firmness: default
origin:
  approved_by: maintainer
  kind: agent
  recorded_at: '2026-11-23T06:15:17Z'
  ref: 'Maintainer decision, 2026-11-23, approving the Antigravity plugin requirements signoff: "All approved."'
priority: must
status: open
tags:
  - antigravity
  - plugin
  - mcp
title: kibi-antigravity MCP launcher discovers Kibi workspaces via roots/list and stays silent outside Kibi repos
rationale: Global Antigravity Marketplace installs launch MCP servers from the plugin directory rather than the user's opened repository, so the launcher must resolve Kibi repositories dynamically while staying silent in non-Kibi repositories.
semantic_text: When the resolved workspace root owns .kb/manifest.json, the kibi-antigravity MCP launcher must proxy the project-local kibi-mcp server. When launched outside a Kibi workspace, the kibi-antigravity MCP launcher must discover an opted-in Kibi repository via MCP roots/list or an explicit workspaceRoot and otherwise expose no tools.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9a5119bffe3367bedd14e38eb4c6a6101d73d1b9d3d549c67e33f9eaea785078
semantic_inventory:
  - claim_key: CLAIM-11CBE1AF0B7F1C81
    claim_text: When the resolved workspace root owns .kb/manifest.json, the kibi-antigravity MCP launcher must proxy the project-local kibi-mcp server
    role: condition
    status: modeled
    span:
      start: 0
      end: 135
    subjects:
      - antigravity.kibi_plugin
  - claim_key: CLAIM-5A5372AD9E4DF0D9
    claim_text: When launched outside a Kibi workspace, the kibi-antigravity MCP launcher must discover an opted-in Kibi repository via MCP roots/list or an explicit workspaceRoot and otherwise expose no tools
    role: condition
    status: modeled
    span:
      start: 137
      end: 330
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-11CBE1AF0B7F1C81
  - CLAIM-5A5372AD9E4DF0D9
id: REQ-antigravity-mcp-workspace-discovery
type: req
required_evidence: tested
---
When the resolved workspace root owns .kb/manifest.json, the kibi-antigravity MCP launcher must proxy the project-local kibi-mcp server. When launched outside a Kibi workspace, the kibi-antigravity MCP launcher must discover an opted-in Kibi repository via MCP roots/list or an explicit workspaceRoot and otherwise expose no tools.

## Context

Global Antigravity Marketplace installs launch MCP servers from the plugin directory rather than the user's opened repository, so the launcher must resolve Kibi repositories dynamically while staying silent in non-Kibi repositories.
