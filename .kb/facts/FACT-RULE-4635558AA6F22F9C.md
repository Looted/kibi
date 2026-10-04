---
title: atom rule SEM-245551822006BB1F48222865
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-245551822006BB1F48222865
claim_key: CLAIM-377FABBF19D3105A
claim_text: Kibi must run aggregate validation without executing candidate workspace code
rule_hash: 245551822006bb1f4822286536a5e7b4b632d8a81b6dc258bb02a9d617253ba1
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-245551822006BB1F48222865
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: aggregate_workspace_execution_prohibition
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: no_candidate_workspace_execution
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 1638
claim_span_end: 1715
id: FACT-RULE-4635558AA6F22F9C
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
