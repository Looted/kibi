---
title: atom rule SEM-9275A59A406E806FA53CDC24
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-9275A59A406E806FA53CDC24
claim_key: CLAIM-871721A2555885B9
claim_text: Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges
rule_hash: 9275a59a406e806fa53cdc24ac10a338abe6fec72a7f6dc110000a2b1fb88180
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-9275A59A406E806FA53CDC24
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: no_impact_review_scope
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: permitted_reason
        type: policy_scope
      - kind: const
        value: complete_file
        type: policy_scope
      - kind: const
        value: residual_ranges
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 334
claim_span_end: 444
id: FACT-RULE-E85C9F57248B78E5
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
