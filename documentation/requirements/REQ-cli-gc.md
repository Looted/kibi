---
id: REQ-cli-gc
title: Garbage collection and branch store maintenance
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: should
tags:
  - cli
  - gc
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-006
semantic_text: The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch. This keeps the `.kb/branches/` directory clean and prevents disk bloat from long-deleted features.
semantic_clauses:
  - The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch.
  - This keeps the `.kb/branches/` directory clean and prevents disk bloat from long-deleted features.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 87c1ed61d99b2eda656f9b295530084ec966cfd6c5c2402bb5a41deea70a9a6f
logic_claims:
  - CLAIM-F6BDC944EFE3155C
  - CLAIM-6D4A56A6E8B488CD
semantic_inventory:
  - claim_key: CLAIM-F6BDC944EFE3155C
    claim_text: The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch
    role: descriptive
    status: ontology_gap
    span:
      start: 0
      end: 105
    payload_hash: 649e8fade8ee04f970df96d84f62bffce6e00ce0c32b1eb18ae1ed5112b10b2c
    reason: No approved domain predicate schema expresses this clause; generic logical_requirement_rule grounding was removed.
  - claim_key: CLAIM-6D4A56A6E8B488CD
    claim_text: This keeps the `.kb/branches/` directory clean and prevents disk bloat from long-deleted features
    role: descriptive
    status: ontology_gap
    span:
      start: 107
      end: 204
    payload_hash: 649e8fade8ee04f970df96d84f62bffce6e00ce0c32b1eb18ae1ed5112b10b2c
    reason: No approved domain predicate schema expresses this clause; generic logical_requirement_rule grounding was removed.
type: req
---

The `kibi gc` command removes stale KB branch stores that no longer have a corresponding local git branch.
This keeps the `.kb/branches/` directory clean and prevents disk bloat from long-deleted features.
