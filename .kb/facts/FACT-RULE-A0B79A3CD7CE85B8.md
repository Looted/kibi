---
title: atom rule SEM-0005C7C4A66CCABE016CDF0C
status: active
text_ref: documentation/impact-review-stage-e.md
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: failed_analysis_rejection
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: after_side_syntax_error
        type: policy_scope
      - kind: const
        value: after_side_failed_source_analyzer
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
rule_hash: 0005c7c4a66ccabe016cdf0c27d870d14eeb62f78d9043a87d663309d074dc14
semantic_key: SEM-0005C7C4A66CCABE016CDF0C
canonical_key: SEM-0005C7C4A66CCABE016CDF0C
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
claim_key: CLAIM-7F35CFCC9C4CD183
claim_text: Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers
claim_span_start: 685
claim_span_end: 783
tags:
  - lane:logic
  - logic-ir-v1
id: FACT-RULE-A0B79A3CD7CE85B8
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
