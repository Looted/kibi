---
title: Subject keys converge on a shared component vocabulary
status: open
priority: must
tags:
  - modeling
  - vocabulary-convergence
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
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
Kibi check must report a subject key derived from a requirement ID as a subject-key-identity warning. Kibi check must report a subject key that is not dotted lowercase snake segments as a subject-key-shape warning. kb_model_requirement must reuse the existing subject fact when the ranked vocabulary matches the clause. kb_model_requirement must explicitly declare a new subject when no existing subject matches the clause.

## Why
52 of 89 subject keys in Kibi's own KB were derived from requirement IDs, because the fallback claim took its subject from the file name. Equivalent claims therefore landed on different subjects, and redundancy stayed at zero even where requirements overlapped: divergence, not a lack of duplicates, was hiding it. Modeling now ranks existing subjects first, and only explains a new one.
