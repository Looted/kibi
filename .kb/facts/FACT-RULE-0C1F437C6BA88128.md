---
title: atom rule SEM-B3C82FF9E46EF959D17F115C
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-B3C82FF9E46EF959D17F115C
claim_key: CLAIM-0D7CD614A390E0F2
claim_text: Kibi must preserve authored source and knowledge-document contents and the Git index while preparing a review without approving a review or creating proof
rule_hash: b3c82ff9e46ef959d17f115c587c5622b52d9af001c2cc7a11f43451af213ef5
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-B3C82FF9E46EF959D17F115C
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: public_review_preparation_preservation
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: authored_source_contents
        type: policy_scope
      - kind: const
        value: knowledge_document_contents
        type: policy_scope
      - kind: const
        value: git_index
        type: policy_scope
      - kind: const
        value: no_review_approval
        type: policy_scope
      - kind: const
        value: no_proof_creation
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 489
claim_span_end: 643
id: FACT-RULE-0C1F437C6BA88128
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
