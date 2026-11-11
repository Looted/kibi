---
title: Requirements can intentionally restate other requirements
status: open
priority: must
tags:
  - relationships
  - redundancy
  - vocabulary-convergence
semantic_text: Kibi must accept restates as a relationship from one requirement to another requirement. A restates link must keep both linked requirements current.
semantic_clauses:
  - Kibi must accept restates as a relationship from one requirement to another requirement.
  - A restates link must keep both linked requirements current.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cbb449dd5774db562d2956f39e7672ad1e51503577701b4af5be94f3d63cbb66
logic_claims:
  - CLAIM-5AD5D9E7A7528F35
  - CLAIM-4EA4DBCF8E225360
semantic_inventory:
  - claim_key: CLAIM-5AD5D9E7A7528F35
    claim_text: Kibi must accept restates as a relationship from one requirement to another requirement
    role: normative
    status: modeled
    span:
      start: 0
      end: 87
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-4EA4DBCF8E225360
    claim_text: A restates link must keep both linked requirements current
    role: normative
    status: modeled
    span:
      start: 89
      end: 147
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
id: REQ-kibi-restates-relationship
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
Kibi must accept restates as a relationship from one requirement to another requirement. A restates link must keep both linked requirements current.

## Why
Some requirements repeat another on purpose. Supersedes would retire one of them, so restates silences the redundancy finding while keeping both current.
