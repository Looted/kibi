---
title: atom rule SEM-2EE32666A6F5E9276DFAC5A5
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-2EE32666A6F5E9276DFAC5A5
claim_key: CLAIM-43E7502CC01143B9
claim_text: Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy
rule_hash: 2ee32666a6f5e9276dfac5a527de041c5c3d114462e602ddd3dcd0c9a36fd6b3
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-2EE32666A6F5E9276DFAC5A5
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: impact_review_binding
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: complete_git_inventory
        type: policy_scope
      - kind: const
        value: before_after_source_bytes
        type: policy_scope
      - kind: const
        value: authored_knowledge_fingerprints
        type: policy_scope
      - kind: const
        value: analyzer_provenance
        type: policy_scope
      - kind: const
        value: trusted_target_policy
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 0
claim_span_end: 208
id: FACT-RULE-8260B0DDF16BBA40
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
