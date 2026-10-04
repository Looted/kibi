---
title: atom rule SEM-1C6AE04CA8143700EE09E3B1
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-1C6AE04CA8143700EE09E3B1
claim_key: CLAIM-95B622628DF93B07
claim_text: Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement
rule_hash: 1c6ae04ca8143700ee09e3b14da49480c4d8998809099009bf8d05c4212c5a21
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-1C6AE04CA8143700EE09E3B1
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: requirement_knowledge_decision
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: each_affected_requirement
        type: policy_scope
      - kind: const
        value: updated_or_still_current
        type: policy_scope
      - kind: const
        value: written_explanation
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 210
claim_span_end: 332
id: FACT-RULE-422EC5396ECB1262
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
