---
title: atom rule SEM-5280F817E595817637C7E9C8
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-5280F817E595817637C7E9C8
claim_key: CLAIM-8705A8806E2038ED
claim_text: Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy
rule_hash: 5280f817e595817637c7e9c811f5f87bf61cc44e1067a57da6a942c752049e82
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-5280F817E595817637C7E9C8
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: unsupported_analysis_review
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: explicit_whole_file_review
        type: policy_scope
      - kind: const
        value: trusted_policy_permission
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 544
claim_span_end: 653
id: FACT-RULE-C838CF73B884B1A2
type: fact
---
