---
title: Entity body context check rules
status: open
priority: must
firmness: firm
semantic_text: The entity context rules shall be entity-context-missing and entity-context-acknowledged. The context review tag shall be review:context-missing. The entity body context check shall start at KB schema version 8.
semantic_clauses:
  - The entity context rules shall be entity-context-missing and entity-context-acknowledged.
  - The context review tag shall be review:context-missing.
  - The entity body context check shall start at KB schema version 8.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T11:04:40.554Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 84a5c30a4df7224dc43d56c745832c46ab84d0ea8b52a97631f5fae9f748cd34
semantic_inventory:
  - claim_key: CLAIM-B3FD178F3940E1E5
    claim_text: The entity context rules shall be entity-context-missing and entity-context-acknowledged
    role: normative
    status: modeled
    span:
      start: 0
      end: 88
  - claim_key: CLAIM-6949C5497269C18C
    claim_text: The context review tag shall be review:context-missing
    role: normative
    status: modeled
    span:
      start: 90
      end: 144
  - claim_key: CLAIM-B32EB4E2784C2804
    claim_text: The entity body context check shall start at KB schema version 8
    role: normative
    status: modeled
    span:
      start: 146
      end: 210
logic_claims:
  - CLAIM-B3FD178F3940E1E5
  - CLAIM-6949C5497269C18C
  - CLAIM-B32EB4E2784C2804
id: REQ-kb-entity-context-rule-ids
type: req
---
The entity context rules shall be entity-context-missing and entity-context-acknowledged. The context review tag shall be review:context-missing. The entity body context check shall start at KB schema version 8.

## Context

REQ-kb-entity-body-context reports missing context under its own kb_check rules, honors the review:context-missing tag for entities the schema 8 migration recorded, and arrived with KB schema 8. Each is stated here so it is proved against the constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"