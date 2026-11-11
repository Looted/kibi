---
title: Predicate suggestion gates candidates on semantic relevance before binding, and abstains or reports a gap otherwise
status: open
semantic_text: The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated. Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable. A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold. A relevant candidate with incomplete arguments shall return provide_argument_bindings. When no fitting schema exists for a clause, the suggester shall return record_ontology_gap. When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate. For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope.
semantic_clauses:
  - The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated.
  - Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable.
  - A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold.
  - A relevant candidate with incomplete arguments shall return provide_argument_bindings.
  - When no fitting schema exists for a clause, the suggester shall return record_ontology_gap.
  - When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate.
  - For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: db2ad125653b7d12029ea238ce3ac78fe64466242974e1fe3f95014d75cf6a6a
semantic_inventory:
  - claim_key: CLAIM-5F2D30F6461C3BDC
    claim_text: The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated
    role: normative
    status: modeled
    span:
      start: 0
      end: 117
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-18164150DB73374A
    claim_text: Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable
    role: normative
    status: modeled
    span:
      start: 119
      end: 235
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3864D95171BB3A80
    claim_text: A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold
    role: normative
    status: modeled
    span:
      start: 237
      end: 474
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-DBEAE35F1583840D
    claim_text: A relevant candidate with incomplete arguments shall return provide_argument_bindings
    role: normative
    status: modeled
    span:
      start: 476
      end: 561
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-DB9E05D710398E0F
    claim_text: When no fitting schema exists for a clause, the suggester shall return record_ontology_gap
    role: condition
    status: modeled
    span:
      start: 563
      end: 653
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-7EF46CF3EBDAC04C
    claim_text: When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate
    role: condition
    status: modeled
    span:
      start: 655
      end: 809
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A44DA749E058A4B0
    claim_text: For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope
    role: normative
    status: modeled
    span:
      start: 811
      end: 1036
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5F2D30F6461C3BDC
  - CLAIM-18164150DB73374A
  - CLAIM-3864D95171BB3A80
  - CLAIM-DBEAE35F1583840D
  - CLAIM-DB9E05D710398E0F
  - CLAIM-7EF46CF3EBDAC04C
  - CLAIM-A44DA749E058A4B0
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:48:01.049Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - abstention
id: REQ-kibi-suggestion-relevance-gate
type: req
---
The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated. Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable. A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold. A relevant candidate with incomplete arguments shall return provide_argument_bindings. When no fitting schema exists for a clause, the suggester shall return record_ontology_gap. When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate. For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope.

## Context

Relevance is judged before any argument is bound, so a schema never wins just because its slots can be filled, and a clause nothing fits becomes a recorded ontology gap.

Predicate suggestions become facts that proofs rely on, so a schema that fits only because its arguments can be filled, a compound clause modeled whole, or a placeholder passed off as reviewed would each ground a requirement in the wrong meaning.

## Why this changed

Split from REQ-kibi-predicate-suggestion-relevance-v1, which held three behaviors: the relevance gate and its outcomes, how source prose is classified and split into atomic propositions, and the explainable fields of each suggestion. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
