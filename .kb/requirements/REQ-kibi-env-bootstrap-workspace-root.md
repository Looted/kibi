---
title: Env files and doctor resolve the workspace through one resolver
status: open
semantic_text: Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a8ab0ec6fdd250064b3b8f35848361c7ec6a223f567a4d0ce772c37e2ced2f5e
semantic_inventory:
  - claim_key: CLAIM-84CBFD93350DABA2
    claim_text: Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it
    role: normative
    status: modeled
    span:
      start: 0
      end: 150
    reason: Grounded via FACT-PROP-ENV-BOOTSTRAP-WORKSPACE
logic_claims:
  - CLAIM-84CBFD93350DABA2
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T15:04:28.110Z'
firmness: default
required_evidence: tested
tags:
  - env
  - bootstrap
  - doctor
  - cli
  - mcp
  - review:context-missing
id: REQ-kibi-env-bootstrap-workspace-root
type: req
---
Workspace resolution for env files and doctor plugin configuration must use resolveKibiWorkspaceRoot, and MCP resolveWorkspaceRoot must delegate to it.

## Context

resolveKibiWorkspaceRoot in packages/cli/src/env/bootstrap.ts is the one resolver; packages/mcp/src/workspace.ts delegates to it.



## Why this changed

Split from REQ-kibi-env-bootstrap by behavior: the shared bootstrap and its source order, workspace root resolution, and doctor attribution. Each child is owned by the functions that decide it, and keeps the parent's wording.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
