---
title: atom rule SEM-7F48A78FB60B53DCE65A71A0
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-7F48A78FB60B53DCE65A71A0
claim_key: CLAIM-28B4A38C4CA97495
claim_text: Kibi must refresh known Python decorator declaration coordinates only with exact declaration matching and valid content-bound review of the complete inventory
rule_hash: 7f48a78fb60b53dce65a71a00415b8d37a35bfce2c8286874085ae0d499e7337
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-7F48A78FB60B53DCE65A71A0
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: reviewed_coordinate_migration
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: known_python_decorator_declaration
        type: policy_scope
      - kind: const
        value: exact_matching
        type: policy_scope
      - kind: const
        value: complete_inventory_review
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 941
claim_span_end: 1099
id: FACT-RULE-1A11DEAAB3F57889
type: fact
---
