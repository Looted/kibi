---
title: Entity row batch limit
status: open
priority: must
firmness: firm
semantic_text: An entity row batch shall hold at most 200 rows.
semantic_clauses:
  - An entity row batch shall hold at most 200 rows.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T21:33:54.152Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 597981cb537ce07ede04409fbb9de25571b495a4164b9b856598d3ff23b8f123
semantic_inventory:
  - claim_key: CLAIM-F6665DD0020E5123
    claim_text: An entity row batch shall hold at most 200 rows
    role: normative
    status: modeled
    span:
      start: 0
      end: 47
logic_claims:
  - CLAIM-F6665DD0020E5123
id: REQ-kibi-operation-row-limits
type: req
---
An entity row batch shall hold at most 200 rows.

## Context

REQ-kibi-operation-interface-parity has the CLI and MCP run the same operations. They read entity rows in bounded batches of a fixed size, stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"