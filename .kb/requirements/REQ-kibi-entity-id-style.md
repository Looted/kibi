---
title: Kibi flags entity IDs that do not name what they govern
status: open
priority: must
tags:
  - naming
  - validation
  - vocabulary-convergence
semantic_text: Kibi must report an entity whose Markdown filename stem differs from its frontmatter id as an entity-id-style warning. Kibi must report a purely numeric entity ID as an entity-id-style warning where the entity is created. Committed legacy numbered entities must not be reported by entity-id-style.
semantic_clauses:
  - Kibi must report an entity whose Markdown filename stem differs from its frontmatter id as an entity-id-style warning.
  - Kibi must report a purely numeric entity ID as an entity-id-style warning where the entity is created.
  - Committed legacy numbered entities must not be reported by entity-id-style.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ea697f8a36a29018fb0672075ef35fa96c53546386f2c44337772890dc2e098e
logic_claims:
  - CLAIM-3BC678A2B9042C97
  - CLAIM-7DEF5563491F6A34
  - CLAIM-14D97916890A3CDD
semantic_inventory:
  - claim_key: CLAIM-3BC678A2B9042C97
    claim_text: Kibi must report an entity whose Markdown filename stem differs from its frontmatter id as an entity-id-style warning
    role: normative
    status: modeled
    span:
      start: 0
      end: 117
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-7DEF5563491F6A34
    claim_text: Kibi must report a purely numeric entity ID as an entity-id-style warning where the entity is created
    role: normative
    status: modeled
    span:
      start: 119
      end: 220
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-14D97916890A3CDD
    claim_text: Committed legacy numbered entities must not be reported by entity-id-style
    role: normative
    status: modeled
    span:
      start: 222
      end: 296
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
id: REQ-kibi-entity-id-style
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi must report an entity whose Markdown filename stem differs from its frontmatter id as an entity-id-style warning. Kibi must report a purely numeric entity ID as an entity-id-style warning where the entity is created. Committed legacy numbered entities must not be reported by entity-id-style.
