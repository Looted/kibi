---
title: Property values are compared in canonical units
status: open
priority: must
tags:
  - validation
  - units
  - vocabulary-convergence
  - review:context-missing
semantic_text: Kibi must compare property values with a known duration, data-size, or percentage unit in the base unit of that family. Kibi must store authored property values and units unchanged. Unknown or ambiguous units must never be equated with a different unit.
semantic_clauses:
  - Kibi must compare property values with a known duration, data-size, or percentage unit in the base unit of that family.
  - Kibi must store authored property values and units unchanged.
  - Unknown or ambiguous units must never be equated with a different unit.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 134d381e340bbbba4899f537f2a57be9783a38a36c8a28b7de819613816b26c5
logic_claims:
  - CLAIM-3A1971DCD21E93FC
  - CLAIM-B6138005D67D2B94
  - CLAIM-C2674CFCC7DD3694
semantic_inventory:
  - claim_key: CLAIM-3A1971DCD21E93FC
    claim_text: Kibi must compare property values with a known duration, data-size, or percentage unit in the base unit of that family
    role: normative
    status: modeled
    span:
      start: 0
      end: 118
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-B6138005D67D2B94
    claim_text: Kibi must store authored property values and units unchanged
    role: normative
    status: modeled
    span:
      start: 120
      end: 180
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-C2674CFCC7DD3694
    claim_text: Unknown or ambiguous units must never be equated with a different unit
    role: normative
    status: modeled
    span:
      start: 182
      end: 252
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
id: REQ-kibi-unit-canonicalization
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi must compare property values with a known duration, data-size, or percentage unit in the base unit of that family. Kibi must store authored property values and units unchanged. Unknown or ambiguous units must never be equated with a different unit.
