---
title: atom rule SEM-CEB50A8109E6C4A18C3D9240
status: active
text_ref: documentation/impact-review-stage-e.md
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: partial_analysis_review
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: every_permitted_after_side_limitation
        type: policy_scope
      - kind: const
        value: changed_line_overlap_range
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
rule_hash: ceb50a8109e6c4a18c3d9240be4969df7d66fc4285ddad861ae8ca6b5145413e
semantic_key: SEM-CEB50A8109E6C4A18C3D9240
canonical_key: SEM-CEB50A8109E6C4A18C3D9240
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
claim_key: CLAIM-3DC4E54394289A04
claim_text: Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line
claim_span_start: 446
claim_span_end: 572
tags:
  - lane:logic
  - logic-ir-v1
id: FACT-RULE-A2FEC4BC3237EA4B
type: fact
---
