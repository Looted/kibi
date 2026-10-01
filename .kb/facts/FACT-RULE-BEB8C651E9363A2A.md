---
title: atom rule SEM-B50CA3707BADCF683AF63D38
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-B50CA3707BADCF683AF63D38
claim_key: CLAIM-3A4340EBE891D8D0
claim_text: Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence
rule_hash: b50ca3707badcf683af63d38183b5e90e2f7dfc4fadfe499be22b285f4f24541
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-B50CA3707BADCF683AF63D38
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: review_rejection_preservation
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
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 897
claim_span_end: 991
id: FACT-RULE-BEB8C651E9363A2A
type: fact
---
