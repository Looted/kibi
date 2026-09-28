---
title: atom rule SEM-11BF79BE6B79E9371EB77456
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-11BF79BE6B79E9371EB77456
claim_key: CLAIM-88027D04B064A8B3
claim_text: Kibi must require explicit review of every permitted partial-analysis limitation and exact range
rule_hash: 11bf79be6b79e9371eb77456641905f414f6c7363308be31c916753f58fe507b
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-11BF79BE6B79E9371EB77456
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: partial_analysis_review
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: every_permitted_limitation
        type: policy_scope
      - kind: const
        value: exact_range
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 446
claim_span_end: 542
id: FACT-RULE-7F88A1ACC472091C
type: fact
---
