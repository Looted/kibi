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
  - hooks
  - mcp
title: kibi-antigravity recognizes Antigravity Kibi MCP and CLI tool calls and stamps workspaceRoot
rationale: Antigravity invokes MCP tools through call_mcp_tool, so hooks need dedicated unwrapping, usage extraction, and workspaceRoot stamping to keep the MCP server attached to the active repository.
semantic_text: kibi-antigravity must recognize Kibi operations invoked directly, through Antigravity's call_mcp_tool wrapper, or through the project-local CLI and extract explored paths, entity IDs, and verified git commits. Before a Kibi MCP call runs in an opted-in workspace, kibi-antigravity must stamp workspaceRoot onto calls that omit it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 53a2341bf94d8eff7518c22a9d4c072aa2bd06964d398d1de9b805aae56146d8
semantic_inventory:
  - claim_key: CLAIM-A96DA830847A2FD5
    claim_text: kibi-antigravity must recognize Kibi operations invoked directly, through Antigravity's call_mcp_tool wrapper, or through the project-local CLI and extract explored paths, entity IDs, and verified git commits
    role: normative
    status: modeled
    span:
      start: 0
      end: 208
    subjects:
      - antigravity.kibi_plugin
  - claim_key: CLAIM-4E49BD1A4203271B
    claim_text: Before a Kibi MCP call runs in an opted-in workspace, kibi-antigravity must stamp workspaceRoot onto calls that omit it
    role: normative
    status: modeled
    span:
      start: 210
      end: 329
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-A96DA830847A2FD5
  - CLAIM-4E49BD1A4203271B
id: REQ-antigravity-kb-tool-recognition
type: req
---
kibi-antigravity must recognize Kibi operations invoked directly, through Antigravity's call_mcp_tool wrapper, or through the project-local CLI and extract explored paths, entity IDs, and verified git commits. Before a Kibi MCP call runs in an opted-in workspace, kibi-antigravity must stamp workspaceRoot onto calls that omit it.

## Context

Antigravity invokes MCP tools through call_mcp_tool, so hooks need dedicated unwrapping, usage extraction, and workspaceRoot stamping to keep the MCP server attached to the active repository.
