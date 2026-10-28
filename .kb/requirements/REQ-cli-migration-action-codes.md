---
title: Requirement status migration codes
status: open
priority: must
firmness: firm
semantic_text: A migrated delivered requirement shall carry the tag implemented. The delivered status migration action id shall be req-status-delivered-map. The delivered status migration code shall be req_status_delivered_map. The entity type backfill action id shall be entity-type-backfill. The entity type backfill code shall be entity_type_backfill.
semantic_clauses:
  - A migrated delivered requirement shall carry the tag implemented.
  - The delivered status migration action id shall be req-status-delivered-map.
  - The delivered status migration code shall be req_status_delivered_map.
  - The entity type backfill action id shall be entity-type-backfill.
  - The entity type backfill code shall be entity_type_backfill.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T17:41:59.909Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: feb7d10b63240d98919f3742daa4d8592b8c86e67acf9ee90860e8c430e118a1
semantic_inventory:
  - claim_key: CLAIM-8892563ACF42D3F6
    claim_text: A migrated delivered requirement shall carry the tag implemented
    role: normative
    status: modeled
    span:
      start: 0
      end: 64
  - claim_key: CLAIM-5442759934022E88
    claim_text: The delivered status migration action id shall be req-status-delivered-map
    role: normative
    status: modeled
    span:
      start: 66
      end: 140
  - claim_key: CLAIM-1AF42E148EEE9D9C
    claim_text: The delivered status migration code shall be req_status_delivered_map
    role: normative
    status: modeled
    span:
      start: 142
      end: 211
  - claim_key: CLAIM-F2939200E1E5CA64
    claim_text: The entity type backfill action id shall be entity-type-backfill
    role: normative
    status: modeled
    span:
      start: 213
      end: 277
  - claim_key: CLAIM-1A3FD18EB41F242A
    claim_text: The entity type backfill code shall be entity_type_backfill
    role: normative
    status: modeled
    span:
      start: 279
      end: 338
logic_claims:
  - CLAIM-8892563ACF42D3F6
  - CLAIM-5442759934022E88
  - CLAIM-1AF42E148EEE9D9C
  - CLAIM-F2939200E1E5CA64
  - CLAIM-1A3FD18EB41F242A
id: REQ-cli-migration-action-codes
type: req
---
A migrated delivered requirement shall carry the tag implemented. The delivered status migration action id shall be req-status-delivered-map. The delivered status migration code shall be req_status_delivered_map. The entity type backfill action id shall be entity-type-backfill. The entity type backfill code shall be entity_type_backfill.

## Context

REQ-cli-migrate-legacy-requirement-status has kibi migrate map a delivered requirement status to a tag and report the step under a stable action id and code; the entity type backfill reports the same way. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"