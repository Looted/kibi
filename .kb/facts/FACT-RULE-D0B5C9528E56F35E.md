---
title: rule rule SEM-2E7CD9BC0BB7161C1D5F9F8D
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: preserve_atomic_propositions
    args:
      - kind: var
        name: V1
        type: source
  body:
    kind: atom
    name: source_contains_conjunction
    args:
      - kind: var
        name: V1
        type: source
  variables:
    - name: V1
      type: source
      quantifier: forall
rule_hash: 2e7cd9bc0bb7161c1d5f9f8d64ce698e835d09e79a9debe8fd205ee1df65ec32
semantic_key: SEM-2E7CD9BC0BB7161C1D5F9F8D
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-2E7CD9BC0BB7161C1D5F9F8D
claim_key: CLAIM-5D615AA01B945895
claim_text: Conjunctions in the source prose shall preserve each atomic proposition in the semantic inventory
claim_span_start: 0
claim_span_end: 97
tags:
  - lane:logic
  - logic-ir-v1
id: FACT-RULE-D0B5C9528E56F35E
type: fact
---
