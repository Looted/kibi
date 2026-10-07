---
title: Subject keys converge on a shared component vocabulary
status: open
priority: must
tags:
  - modeling
  - vocabulary-convergence
  - review:context-missing
semantic_text: Kibi check must report a subject key derived from a requirement ID as a subject-key-identity warning. Kibi check must report a subject key that is not dotted lowercase snake segments as a subject-key-shape warning. kb_model_requirement must reuse the existing subject fact when the ranked vocabulary matches the clause. kb_model_requirement must explicitly declare a new subject when no existing subject matches the clause.
semantic_clauses:
  - Kibi check must report a subject key derived from a requirement ID as a subject-key-identity warning.
  - Kibi check must report a subject key that is not dotted lowercase snake segments as a subject-key-shape warning.
  - kb_model_requirement must reuse the existing subject fact when the ranked vocabulary matches the clause.
  - kb_model_requirement must explicitly declare a new subject when no existing subject matches the clause.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1ce0dfc693d77f5fa7bd2ba6b4f0563c96e1f2d488003b2328efaf5e53ed505b
logic_claims:
  - CLAIM-82048A289457633B
  - CLAIM-4FCA4BED9A81A246
  - CLAIM-CB05263E55AFCDE3
  - CLAIM-8902FAF155FB6FFC
semantic_inventory:
  - claim_key: CLAIM-82048A289457633B
    claim_text: Kibi check must report a subject key derived from a requirement ID as a subject-key-identity warning
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-4FCA4BED9A81A246
    claim_text: Kibi check must report a subject key that is not dotted lowercase snake segments as a subject-key-shape warning
    role: normative
    status: modeled
    span:
      start: 102
      end: 213
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-CB05263E55AFCDE3
    claim_text: kb_model_requirement must reuse the existing subject fact when the ranked vocabulary matches the clause
    role: normative
    status: modeled
    span:
      start: 215
      end: 318
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-8902FAF155FB6FFC
    claim_text: kb_model_requirement must explicitly declare a new subject when no existing subject matches the clause
    role: normative
    status: modeled
    span:
      start: 320
      end: 422
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
id: REQ-kibi-subject-vocabulary
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi check must report a subject key derived from a requirement ID as a subject-key-identity warning. Kibi check must report a subject key that is not dotted lowercase snake segments as a subject-key-shape warning. kb_model_requirement must reuse the existing subject fact when the ranked vocabulary matches the clause. kb_model_requirement must explicitly declare a new subject when no existing subject matches the clause.
