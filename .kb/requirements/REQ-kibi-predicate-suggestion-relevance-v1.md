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
semantic_text: The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated. Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable. A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold. A relevant candidate with incomplete arguments shall return provide_argument_bindings. When no fitting schema exists for a clause, the suggester shall return record_ontology_gap. When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate. For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope. Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative. Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory. The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings. The applicability threshold shall be 0.62. The weak-candidate margin shall be 0.06.
semantic_clauses:
  - The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated
  - Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable
  - A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold
  - A relevant candidate with incomplete arguments shall return provide_argument_bindings
  - When no fitting schema exists for a clause, the suggester shall return record_ontology_gap
  - When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate
  - For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope
  - Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative
  - Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory
  - The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings
  - The applicability threshold shall be 0.62
  - The weak-candidate margin shall be 0.06
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
  - CLAIM-DF5F85EFF9599777
  - CLAIM-85F4539DE7FF58E8
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c6684118e9cb41be0ca15b8a6a51cb8da449f84fb856a7f3a4b20c1bd1f54979
semantic_inventory:
  - claim_key: CLAIM-5F2D30F6461C3BDC
    claim_text: The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated
    role: normative
    status: modeled
    span:
      start: 0
      end: 117
    semantic_key: SEM-3E35F7298291A7AAA1846F10
  - claim_key: CLAIM-18164150DB73374A
    claim_text: Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable
    role: normative
    status: modeled
    span:
      start: 119
      end: 235
    semantic_key: SEM-DB381C9B614A29C54D06162F
  - claim_key: CLAIM-3864D95171BB3A80
    claim_text: A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold
    role: normative
    status: modeled
    span:
      start: 237
      end: 474
    semantic_key: SEM-C16F55F597863913765C7A8D
  - claim_key: CLAIM-DBEAE35F1583840D
    claim_text: A relevant candidate with incomplete arguments shall return provide_argument_bindings
    role: normative
    status: modeled
    span:
      start: 476
      end: 561
    semantic_key: SEM-2D212BDC65EF5E54BC56E402
  - claim_key: CLAIM-DB9E05D710398E0F
    claim_text: When no fitting schema exists for a clause, the suggester shall return record_ontology_gap
    role: condition
    status: modeled
    span:
      start: 563
      end: 653
    semantic_key: SEM-90491BB24F4E4A776E9204DB
  - claim_key: CLAIM-7EF46CF3EBDAC04C
    claim_text: When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate
    role: condition
    status: modeled
    span:
      start: 655
      end: 809
    semantic_key: SEM-17BCF8F82356DC300EBCCDB6
  - claim_key: CLAIM-A44DA749E058A4B0
    claim_text: For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope
    role: normative
    status: modeled
    span:
      start: 811
      end: 1036
    semantic_key: SEM-E131EB8A6A477433012EB24F
  - claim_key: CLAIM-ABA932CA8D47C522
    claim_text: Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative
    role: normative
    status: modeled
    span:
      start: 1038
      end: 1163
    semantic_key: SEM-5E45D3F6D973A7F17CBCEE73
  - claim_key: CLAIM-5D615AA01B945895
    claim_text: Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory
    role: normative
    status: modeled
    span:
      start: 1165
      end: 1262
    semantic_key: SEM-2E7CD9BC0BB7161C1D5F9F8D
  - claim_key: CLAIM-F445257BCA5C30BB
    claim_text: The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings
    role: normative
    status: modeled
    span:
      start: 1264
      end: 1443
    semantic_key: SEM-F7761B8C86BCF4368A2E415F
  - claim_key: CLAIM-DF5F85EFF9599777
    claim_text: The applicability threshold shall be 0.62
    role: normative
    status: modeled
    span:
      start: 1445
      end: 1486
  - claim_key: CLAIM-85F4539DE7FF58E8
    claim_text: The weak-candidate margin shall be 0.06
    role: normative
    status: modeled
    span:
      start: 1488
      end: 1527
id: REQ-kibi-predicate-suggestion-relevance-v1
type: req
---
The predicate suggester shall reject semantically unrelated schemas even when all of their arguments can be populated. Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable. A candidate shall be recommended only when usage guidance and required semantic cues match, prohibited cues are absent, every argument is explicitly reviewed or high-confidence extracted, and applicability exceeds the relevance threshold. A relevant candidate with incomplete arguments shall return provide_argument_bindings. When no fitting schema exists for a clause, the suggester shall return record_ontology_gap. When the leading eligible candidates fall within the deterministic weak-candidate margin, the suggester shall abstain instead of applying either candidate. For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope. Modal-free validity, rejection, prohibition, required-outcome, and failure-policy assertions shall be classified as normative. Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory. The output shall expose eligibility, rejection_reasons, binding_provenance, applicability_score, and score components without treating generic inferred values as reviewed bindings. The applicability threshold shall be 0.62. The weak-candidate margin shall be 0.06.
