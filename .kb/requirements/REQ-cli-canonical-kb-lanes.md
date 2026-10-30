---
title: The canonical .kb knowledge lanes
status: open
priority: must
firmness: firm
semantic_text: The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events.
semantic_clauses:
  - The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T10:10:05.363Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f25971662e38de066b5f20755cccda537a7ae7b8aa20ec2b8259c922304c5dcb
semantic_inventory:
  - claim_key: CLAIM-F0379E1995819F07
    claim_text: The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events
    role: normative
    status: modeled
    span:
      start: 0
      end: 104
logic_claims:
  - CLAIM-F0379E1995819F07
id: REQ-cli-canonical-kb-lanes
type: req
---
The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events.

## Context

ENTITY_LANES in packages/cli/src/utils/kb-paths.ts names the Git-tracked directories under .kb that hold authored entities. REQ-cli-canonical-runtime says how sync discovers them and how kb_upsert writes into them; this requirement states the lane list so it is proved against the code.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"