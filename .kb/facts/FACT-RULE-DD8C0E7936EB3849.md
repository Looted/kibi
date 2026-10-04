---
title: atom rule SEM-F190153D6215C6C4E094C1AD
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-F190153D6215C6C4E094C1AD
claim_key: CLAIM-B614EB288DEC467F
claim_text: Kibi must return an initially invalid review template with no reviewer identity, review time, decisions, generated rationale, signature or proof
rule_hash: f190153d6215c6c4e094c1ad8cc23793d0f99f336a88151410501e10af41aab1
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-F190153D6215C6C4E094C1AD
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: public_review_preparation_unauthored
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: initially_invalid_template
        type: policy_scope
      - kind: const
        value: no_reviewer_identity
        type: policy_scope
      - kind: const
        value: no_review_time
        type: policy_scope
      - kind: const
        value: no_decisions
        type: policy_scope
      - kind: const
        value: no_generated_rationale_signature_or_proof
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 343
claim_span_end: 487
id: FACT-RULE-DD8C0E7936EB3849
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
