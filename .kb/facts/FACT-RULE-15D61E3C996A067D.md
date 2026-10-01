---
title: atom rule SEM-FF30C29010A6B69CB5C31F80
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-FF30C29010A6B69CB5C31F80
claim_key: CLAIM-097BCE1268B9EAEC
claim_text: Kibi must resolve a unique trusted repository, target ref, base and head for aggregate pull request validation
rule_hash: ff30c29010a6b69cb5c31f80dff1146fce77047823853b16769f7244437c12b5
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-FF30C29010A6B69CB5C31F80
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: aggregate_gate_provenance
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: unique_repository
        type: policy_scope
      - kind: const
        value: trusted_target_ref
        type: policy_scope
      - kind: const
        value: base
        type: policy_scope
      - kind: const
        value: head
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 1346
claim_span_end: 1456
id: FACT-RULE-15D61E3C996A067D
type: fact
---
