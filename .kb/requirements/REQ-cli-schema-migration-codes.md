---
title: Schema migration codes
status: open
priority: must
firmness: firm
semantic_text: Entity origins shall arrive with KB schema version 6. The entity origin backfill action id shall be entity-origin-backfill. The entity origin backfill code shall be entity_origin_backfill. The requirement status vocabulary map code shall be req_status_vocabulary_map. The semantic inventory rederive code shall be semantic_inventory_rederive. The semantic inventory review code shall be semantic_inventory_review. The polarity value backfill code shall be polarity_value_backfill.
semantic_clauses:
  - Entity origins shall arrive with KB schema version 6.
  - The entity origin backfill action id shall be entity-origin-backfill.
  - The entity origin backfill code shall be entity_origin_backfill.
  - The requirement status vocabulary map code shall be req_status_vocabulary_map.
  - The semantic inventory rederive code shall be semantic_inventory_rederive.
  - The semantic inventory review code shall be semantic_inventory_review.
  - The polarity value backfill code shall be polarity_value_backfill.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T18:48:53.574Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c5286606b5b94c60414dbf1caed4467c5bb260a0223003c0ebd93b43dd8c5f8b
semantic_inventory:
  - claim_key: CLAIM-D0400FA6B7A49F88
    claim_text: Entity origins shall arrive with KB schema version 6
    role: normative
    status: modeled
    span:
      start: 0
      end: 52
  - claim_key: CLAIM-93CB07992A555443
    claim_text: The entity origin backfill action id shall be entity-origin-backfill
    role: normative
    status: modeled
    span:
      start: 54
      end: 122
  - claim_key: CLAIM-D2986008FAD25622
    claim_text: The entity origin backfill code shall be entity_origin_backfill
    role: normative
    status: modeled
    span:
      start: 124
      end: 187
  - claim_key: CLAIM-A0D1F4B5D1074C78
    claim_text: The requirement status vocabulary map code shall be req_status_vocabulary_map
    role: normative
    status: modeled
    span:
      start: 189
      end: 266
  - claim_key: CLAIM-AF9DC248F0FF1582
    claim_text: The semantic inventory rederive code shall be semantic_inventory_rederive
    role: normative
    status: modeled
    span:
      start: 268
      end: 341
  - claim_key: CLAIM-50D83AC3336F278B
    claim_text: The semantic inventory review code shall be semantic_inventory_review
    role: normative
    status: modeled
    span:
      start: 343
      end: 412
  - claim_key: CLAIM-9D5492D92C96C6BA
    claim_text: The polarity value backfill code shall be polarity_value_backfill
    role: normative
    status: modeled
    span:
      start: 414
      end: 479
logic_claims:
  - CLAIM-D0400FA6B7A49F88
  - CLAIM-93CB07992A555443
  - CLAIM-D2986008FAD25622
  - CLAIM-A0D1F4B5D1074C78
  - CLAIM-AF9DC248F0FF1582
  - CLAIM-50D83AC3336F278B
  - CLAIM-9D5492D92C96C6BA
id: REQ-cli-schema-migration-codes
type: req
---
Entity origins shall arrive with KB schema version 6. The entity origin backfill action id shall be entity-origin-backfill. The entity origin backfill code shall be entity_origin_backfill. The requirement status vocabulary map code shall be req_status_vocabulary_map. The semantic inventory rederive code shall be semantic_inventory_rederive. The semantic inventory review code shall be semantic_inventory_review. The polarity value backfill code shall be polarity_value_backfill.

## Context

REQ-cli-schema-migration has kibi migrate report every step under a stable code an agent can act on: the origin backfill that arrived with KB schema 6, the status vocabulary map, the semantic inventory rederive and review steps and the polarity value backfill. They are stated here so every code is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"