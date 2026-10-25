---
title: The kibi sync summary reports KB totals beside what the sync imported
status: open
required_evidence: tested
priority: must
tags:
  - cli
  - sync
semantic_text: The kibi sync summary must report the number of entities of each type the KB holds after the sync. The kibi sync summary must label the entities a sync imported as counts from changed sources only.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 77fde55ca8f2d2e72ecfa871aff417ccb32c97760de1eef461f22afd61ebd148
semantic_inventory:
  - claim_key: CLAIM-0958EB1E430FBD52
    claim_text: The kibi sync summary must report the number of entities of each type the KB holds after the sync
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
  - claim_key: CLAIM-E10FD05EAC1101D3
    claim_text: The kibi sync summary must label the entities a sync imported as counts from changed sources only
    role: normative
    status: modeled
    span:
      start: 99
      end: 196
logic_claims:
  - CLAIM-0958EB1E430FBD52
  - CLAIM-E10FD05EAC1101D3
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:53.102Z'
id: REQ-cli-sync-summary-kb-totals
type: req
---
The kibi sync summary must report the number of entities of each type the KB holds after the sync. The kibi sync summary must label the entities a sync imported as counts from changed sources only.

## Context

`kibi sync` printed "Entity Counts" from the sources it recompiled, not from the KB. The first sync after a migration printed `req: 6` for a KB holding 43 requirements, and a sync after one upsert printed `req: 1`, which reads as the KB having lost its entities. Seen in a test project during a real legacy-KB migration. Reported by the project owner.

The summary now opens with the KB totals by type and the KB relationship count, counted from the store after the sync, and then labels the imported counts as changed sources only. When the store cannot be counted it falls back to the old block.

## Source

> `kibi sync` "Entity Counts" shows only the imported delta. Show KB totals, or label the delta clearly and add totals next to it.
