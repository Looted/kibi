---
title: MCP workspace root argument
status: open
priority: must
firmness: firm
semantic_text: The MCP server shall route a call by its workspaceRoot argument.
semantic_clauses:
  - The MCP server shall route a call by its workspaceRoot argument.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:35:26.907Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 866c0fd7c37c639588dc92296b32541becec5bd62beaa01894027925ed1baaaa
semantic_inventory:
  - claim_key: CLAIM-220FC8EBDC962FCB
    claim_text: The MCP server shall route a call by its workspaceRoot argument
    role: normative
    status: modeled
    span:
      start: 0
      end: 63
logic_claims:
  - CLAIM-220FC8EBDC962FCB
id: REQ-mcp-workspace-root-argument
type: req
---
The MCP server shall route a call by its workspaceRoot argument.

## Context

packages/mcp/src/server/workspace-router.ts routes each tool call to the workspace REQ-mcp-workspace-routing names. The argument it reads is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"