---
title: Agent plugin workspace variables
status: open
priority: must
firmness: firm
semantic_text: A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT. An agent host shall pass the workspace to Kibi tools as workspaceRoot.
semantic_clauses:
  - A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT.
  - An agent host shall pass the workspace to Kibi tools as workspaceRoot.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:33:27.430Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3b4f715c2ad6b3a1e23569b9ad04134de1e840b2052bc17e18c801e26cc5cee0
semantic_inventory:
  - claim_key: CLAIM-CB8FD3DDEA956390
    claim_text: A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT
    role: normative
    status: modeled
    span:
      start: 0
      end: 90
  - claim_key: CLAIM-23571A7EFB6D98E2
    claim_text: An agent host shall pass the workspace to Kibi tools as workspaceRoot
    role: normative
    status: modeled
    span:
      start: 92
      end: 161
logic_claims:
  - CLAIM-CB8FD3DDEA956390
  - CLAIM-23571A7EFB6D98E2
id: REQ-agent-workspace-opt-in-keys
type: req
---
A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT. An agent host shall pass the workspace to Kibi tools as workspaceRoot.

## Context

packages/claude/src/workspace-optin.ts decides which workspace the plugin REQ-claude-code-kibi-plugin-v1 serves, and packages/agent-core/src/kb-mcp-tools.ts names the argument hosts pass it to Kibi tools in. Both are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"