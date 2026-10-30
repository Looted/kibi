---
title: Semantic inventory and sync cache settings
status: open
priority: must
firmness: firm
semantic_text: The semantic inventory version shall be kibi.semantic-inventory.v1. The staged inventory drift rule shall be semantic-inventory-drift. The sync cache version shall be 2. A sync cache entry shall live at most 2592000000 milliseconds.
semantic_clauses:
  - The semantic inventory version shall be kibi.semantic-inventory.v1.
  - The staged inventory drift rule shall be semantic-inventory-drift.
  - The sync cache version shall be 2.
  - A sync cache entry shall live at most 2592000000 milliseconds.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T19:05:13.148Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 690ffff991cdbf5fda061716dd801de02ad87c17cc46634983915d19c8c08fa8
semantic_inventory:
  - claim_key: CLAIM-FDC0710E0F577270
    claim_text: The semantic inventory version shall be kibi.semantic-inventory.v1
    role: normative
    status: modeled
    span:
      start: 0
      end: 66
  - claim_key: CLAIM-6DAA24F8B83DBF44
    claim_text: The staged inventory drift rule shall be semantic-inventory-drift
    role: normative
    status: modeled
    span:
      start: 68
      end: 133
  - claim_key: CLAIM-BC31FE42DFB2E5A0
    claim_text: The sync cache version shall be 2
    role: normative
    status: modeled
    span:
      start: 135
      end: 168
  - claim_key: CLAIM-656E6AB2DED99BD6
    claim_text: A sync cache entry shall live at most 2592000000 milliseconds
    role: normative
    status: modeled
    span:
      start: 170
      end: 231
logic_claims:
  - CLAIM-FDC0710E0F577270
  - CLAIM-6DAA24F8B83DBF44
  - CLAIM-BC31FE42DFB2E5A0
  - CLAIM-656E6AB2DED99BD6
id: REQ-ingestion-inventory-settings
type: req
---
The semantic inventory version shall be kibi.semantic-inventory.v1. The staged inventory drift rule shall be semantic-inventory-drift. The sync cache version shall be 2. A sync cache entry shall live at most 2592000000 milliseconds.

## Context

REQ-kibi-proposition-complete-ingestion stores a versioned semantic inventory on every requirement, reports a staged inventory that drifted from its prose under its own rule, and keeps a sync cache with a version and an age bound. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"