---
title: atom rule SEM-CEDDA9F92ABE17CA5F5A792B
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-CEDDA9F92ABE17CA5F5A792B
claim_key: CLAIM-2B3C543C216F686F
claim_text: Kibi must validate the complete merge-base-to-head Git inventory in the aggregate pull request gate
rule_hash: cedda9f92abe17ca5f5a792ba99c4cd44fef3a899d3493ea1684fc33c09c5b7b
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-CEDDA9F92ABE17CA5F5A792B
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: aggregate_gate_inventory
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: complete_merge_base_to_head_inventory
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 1458
claim_span_end: 1557
id: FACT-RULE-7B4098D7F2BE6F49
type: fact
---
