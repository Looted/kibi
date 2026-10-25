---
title: The pre-commit check blocks an entity the commit adds or edits without body context
status: open
required_evidence: tested
priority: must
tags:
  - cli
  - staged
  - pre-commit
  - entity-context
origin:
  kind: agent
  recorded_at: '2026-10-16T08:50:09.402Z'
id: REQ-cli-staged-entity-context
type: req
semantic_text: The staged check must block an entity document the commit adds or edits when its body lacks the context that kibi check requires. The staged check must not block an entity that already lacked context at the base commit or that the migration acknowledged.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fbd5bb8854bd26918caef09708a8a6b7e88ea7cc197e7a201a6fc213789b88c0
semantic_inventory:
  - claim_key: CLAIM-34ACBED0B126814B
    claim_text: The staged check must block an entity document the commit adds or edits when its body lacks the context that kibi check requires
    role: normative
    status: modeled
    span:
      start: 0
      end: 128
  - claim_key: CLAIM-D540151177F251F4
    claim_text: The staged check must not block an entity that already lacked context at the base commit or that the migration acknowledged
    role: normative
    status: modeled
    span:
      start: 130
      end: 253
logic_claims:
  - CLAIM-34ACBED0B126814B
  - CLAIM-D540151177F251F4
---
The staged check must block an entity document the commit adds or edits when its body lacks the context that kibi check requires. The staged check must not block an entity that already lacked context at the base commit or that the migration acknowledged.

## Context

`kb_upsert` warned that a test entity without a body would be blocked by `kb_check` under `entity-context-missing`, and `kb_check` reported it, yet the pre-commit hook printed that the staged files had no violations and the commit passed. The staged gate ran only the symbol rules and the staged consistency rules, so an agent could commit debt the warning had called blocking. Found in a regression run on a test project migrated from a legacy KB; the project owner asked for the fix.

## Source

> The hook runs `entity-context-missing` on entity documents staged in the commit, and blocks only violations the commit introduces, not ones present at the base tree.
