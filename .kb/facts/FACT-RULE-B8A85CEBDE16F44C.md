---
title: atom rule SEM-61C4E5936A6184D80C55FA1D
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-61C4E5936A6184D80C55FA1D
claim_key: CLAIM-238A73FEB4C358D4
claim_text: Kibi must reject snapshot or trusted provider and evaluator closure drift after completing context projection and before returning preparation data
rule_hash: 61c4e5936a6184d80c55fa1d810e5866c5f7006352aee156e23a1a4ef1cf85b1
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-61C4E5936A6184D80C55FA1D
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: public_review_preparation_drift_rejection
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: snapshot_drift
        type: policy_scope
      - kind: const
        value: trusted_provider_evaluator_closure_drift
        type: policy_scope
      - kind: const
        value: after_context_projection
        type: policy_scope
      - kind: const
        value: before_return
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 767
claim_span_end: 914
id: FACT-RULE-B8A85CEBDE16F44C
type: fact
---
