---
title: Predicate Suggestions Gate Semantic Relevance Before Binding
status: open
priority: must
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - abstention
  - review:context-missing
semantic_text: The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated. Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable. A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold. A relevant candidate with incomplete arguments shall return provide_argument_bindings. When no fitting schema exists for a clause, the suggester shall return record_ontology_gap. When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate. For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope. Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative. Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory. The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings.
semantic_clauses:
  - The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated.
  - Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable.
  - A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold.
  - A relevant candidate with incomplete arguments shall return provide_argument_bindings.
  - When no fitting schema exists for a clause, the suggester shall return record_ontology_gap.
  - When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate.
  - For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope.
  - Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative.
  - Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory.
  - The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings.
logic_claims:
  - CLAIM-5F2D30F6461C3BDC
  - CLAIM-18164150DB73374A
  - CLAIM-3864D95171BB3A80
  - CLAIM-DBEAE35F1583840D
  - CLAIM-DB9E05D710398E0F
  - CLAIM-7EF46CF3EBDAC04C
  - CLAIM-A44DA749E058A4B0
  - CLAIM-ABA932CA8D47C522
  - CLAIM-5D615AA01B945895
  - CLAIM-F445257BCA5C30BB
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5ecc7f1e8e6e8c5db78d9ba733b6d54e3f5db19331dc22ab284750c839ea684d
semantic_inventory:
  - claim_key: CLAIM-5F2D30F6461C3BDC
    claim_text: The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated
    role: normative
    status: modeled
    span:
      start: 0
      end: 117
  - claim_key: CLAIM-18164150DB73374A
    claim_text: Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable
    role: normative
    status: modeled
    span:
      start: 119
      end: 235
  - claim_key: CLAIM-3864D95171BB3A80
    claim_text: A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold
    role: normative
    status: modeled
    span:
      start: 237
      end: 474
  - claim_key: CLAIM-DBEAE35F1583840D
    claim_text: A relevant candidate with incomplete arguments shall return provide_argument_bindings
    role: normative
    status: modeled
    span:
      start: 476
      end: 561
  - claim_key: CLAIM-DB9E05D710398E0F
    claim_text: When no fitting schema exists for a clause, the suggester shall return record_ontology_gap
    role: condition
    status: modeled
    span:
      start: 563
      end: 653
  - claim_key: CLAIM-7EF46CF3EBDAC04C
    claim_text: When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate
    role: condition
    status: modeled
    span:
      start: 655
      end: 809
  - claim_key: CLAIM-A44DA749E058A4B0
    claim_text: For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope
    role: normative
    status: modeled
    span:
      start: 811
      end: 1036
  - claim_key: CLAIM-ABA932CA8D47C522
    claim_text: Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative
    role: normative
    status: modeled
    span:
      start: 1038
      end: 1163
  - claim_key: CLAIM-5D615AA01B945895
    claim_text: Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory
    role: normative
    status: modeled
    span:
      start: 1165
      end: 1262
  - claim_key: CLAIM-F445257BCA5C30BB
    claim_text: The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings
    role: normative
    status: modeled
    span:
      start: 1264
      end: 1443
id: REQ-kibi-predicate-suggestion-relevance-v1
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T08:04:54.717Z'
firmness: firm
---
The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated. Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable. A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold. A relevant candidate with incomplete arguments shall return provide_argument_bindings. When no fitting schema exists for a clause, the suggester shall return record_ontology_gap. When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate. For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope. Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative. Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory. The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings.

## Context

The numeric thresholds this requirement relies on are stated in REQ-kibi-predicate-suggestion-thresholds, where each is proved against the constant the code exports.

## Why this changed

On 2026-10-27 the threshold claims moved to their own requirement so that they can be proved against the exported constants, while the behaviour that uses them stays here, tested end to end.
