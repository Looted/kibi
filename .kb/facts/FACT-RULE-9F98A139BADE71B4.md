---
title: rule rule SEM-E131EB8A6A477433012EB24F
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: draft_recommended_predicate_schema
    args:
      - kind: var
        name: V1
        type: ontology_gap
  body:
    kind: all
    items:
      - kind: atom
        name: draft_is_deterministic_non_null
        args:
          - kind: var
            name: V1
            type: ontology_gap
      - kind: atom
        name: genuine_ontology_gap
        args:
          - kind: var
            name: V1
            type: ontology_gap
  variables:
    - name: V1
      type: ontology_gap
      quantifier: forall
rule_hash: e131eb8a6a477433012eb24fcb430356d1fc22b71b33dba6bad05f740d9433f6
semantic_key: SEM-E131EB8A6A477433012EB24F
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-E131EB8A6A477433012EB24F
claim_key: CLAIM-A44DA749E058A4B0
claim_text: For a genuine ontology gap, recommendedPredicateSchema shall be a deterministic non-null draft containing a predicate name, ordered argument names and types, candidate bindings, unresolved bindings, rationale, and reuse scope
claim_span_start: 0
claim_span_end: 225
tags:
  - lane:logic
  - logic-ir-v1
id: FACT-RULE-9F98A139BADE71B4
type: fact
---
