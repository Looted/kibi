---
title: Entity context check rule names
status: open
priority: must
firmness: firm
semantic_text: An entity without a context body shall be reported as entity-context-missing. An acknowledged missing context shall be reported as entity-context-acknowledged.
semantic_clauses:
  - An entity without a context body shall be reported as entity-context-missing.
  - An acknowledged missing context shall be reported as entity-context-acknowledged.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T16:42:17.964Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 33536147fd1495f2e04b6c5fec92748f39753b89d5fcf0239790cee28a30fded
semantic_inventory:
  - claim_key: CLAIM-EF56D3C7B830536E
    claim_text: An entity without a context body shall be reported as entity-context-missing
    role: normative
    status: modeled
    span:
      start: 0
      end: 76
  - claim_key: CLAIM-D6F9F25234BCBB15
    claim_text: An acknowledged missing context shall be reported as entity-context-acknowledged
    role: normative
    status: modeled
    span:
      start: 78
      end: 158
logic_claims:
  - CLAIM-EF56D3C7B830536E
  - CLAIM-D6F9F25234BCBB15
id: REQ-kb-entity-context-rule-names
type: req
---
An entity without a context body shall be reported as entity-context-missing. An acknowledged missing context shall be reported as entity-context-acknowledged.

## Context

packages/cli/src/public/operations/entity-context.ts reports the findings REQ-kb-entity-body-context defines. Both rule names are stated here so they are proved against the constants.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"