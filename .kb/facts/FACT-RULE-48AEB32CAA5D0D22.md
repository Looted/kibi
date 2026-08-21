---
title: rule rule SEM-DB381C9B614A29C54D06162F
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: evaluate_semantic_applicability
    args:
      - kind: var
        name: V1
        type: candidate
  body:
    kind: atom
    name: candidate_considered
    args:
      - kind: var
        name: V1
        type: candidate
  variables:
    - name: V1
      type: candidate
      quantifier: forall
rule_hash: db381c9b614a29c54d06162f61c60d1290f9a57a03983c89f87eb0fbb47232c1
semantic_key: SEM-DB381C9B614A29C54D06162F
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-DB381C9B614A29C54D06162F
claim_key: CLAIM-18164150DB73374A
claim_text: Candidate selection shall evaluate semantic applicability before argument binding can make a candidate recommendable
claim_span_start: 0
claim_span_end: 116
tags:
  - lane:logic
  - logic-ir-v1
id: FACT-RULE-48AEB32CAA5D0D22
type: fact
---
