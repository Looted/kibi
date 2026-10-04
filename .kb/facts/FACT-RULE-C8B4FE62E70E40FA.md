---
title: atom rule SEM-B05CDFBA710247CC176DCE15
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-B05CDFBA710247CC176DCE15
claim_key: CLAIM-BFC6D501B2221523
claim_text: Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes
rule_hash: b05cdfba710247cc176dce15c29b934eca43b5f2cb8815cd0a27ccf838de3e65
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-B05CDFBA710247CC176DCE15
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: review_content_invalidation
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: source_bytes
        type: policy_scope
      - kind: const
        value: git_index
        type: policy_scope
      - kind: const
        value: head
        type: policy_scope
      - kind: const
        value: policy
        type: policy_scope
      - kind: const
        value: provider
        type: policy_scope
      - kind: const
        value: evaluator
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 785
claim_span_end: 895
id: FACT-RULE-C8B4FE62E70E40FA
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
