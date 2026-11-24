---
title: Host hooks name the session workspace on a Kibi MCP call only when the call carries none
status: open
firmness: firm
required_evidence: tested
tags:
  - kibi
  - agent-hosts
  - hooks
  - mcp
  - worktree
  - strict-modeling
  - confidence:0.90
  - confidence-band:high
  - provenance:mcp-kibi-model-requirement
  - lane:strict
origin:
  kind: human
  ref: 'Stamping: the PreToolUse hook keeps a workspaceRoot the agent passes and fills in the session workspace only for calls without one. (Decision 1 of the implementation plan for #852, approved by the maintainer on 2026-11-23.) Appended 2026-11-24: maintainer signoff on the requirements signoff view of PR #853, asked as "Do you approve requirements 1 and 2 as recorded, including the retirement of REQ-zcode-plugin-package?", answered "Signed off".'
  approved_by: maintainer
  recorded_at: '2026-11-24T07:50:54Z'
rationale: The hooks replaced an explicit workspaceRoot with the session's workspace, so a call meant for another git worktree was answered from the session's checkout, while the kibi-usage skill tells an agent to pass workspaceRoot for a worktree.
semantic_text: The Claude Code, Codex, Cursor and ZCode pre-tool hooks must add the session's workspace as `workspaceRoot` to a Kibi MCP call only when the call carries none.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 377a6a1242397e229b5c7281db1a261262404c9af0e67de9d9fbf835e2f4ec78
semantic_inventory:
  - claim_key: CLAIM-2EDAAD7B05269AF2
    claim_text: The Claude Code, Codex, Cursor and ZCode pre-tool hooks must add the session's workspace as `workspaceRoot` to a Kibi MCP call only when the call carries none
    role: normative
    status: modeled
    span:
      start: 0
      end: 158
    subjects:
      - kibi.host.hook_inputs
logic_claims:
  - CLAIM-2EDAAD7B05269AF2
id: REQ-agent-hosts-kb-call-workspace-stamp
type: req
text_ref: mcp://kibi/model-requirement
semantic_clauses:
  - The Claude Code, Codex, Cursor and ZCode pre-tool hooks must add the session's workspace as `workspaceRoot` to a Kibi MCP call only when the call carries none.
---
The Claude Code, Codex, Cursor and ZCode pre-tool hooks must add the session's workspace as `workspaceRoot` to a Kibi MCP call only when the call carries none.

## Context

The hooks replaced an explicit workspaceRoot with the session's workspace, so a call meant for another git worktree was answered from the session's checkout, while the kibi-usage skill tells an agent to pass workspaceRoot for a worktree.

## Source

> Stamping: the PreToolUse hook keeps a workspaceRoot the agent passes and fills in the session workspace only for calls without one. (Decision 1 of the implementation plan for #852, approved by the maintainer on 2026-11-23.) Appended 2026-11-24: maintainer signoff on the requirements signoff view of PR #853, asked as "Do you approve requirements 1 and 2 as recorded, including the retirement of REQ-zcode-plugin-package?", answered "Signed off".
