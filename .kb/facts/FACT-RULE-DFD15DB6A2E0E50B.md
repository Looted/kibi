---
title: atom rule SEM-84175995D3B9E4446FC83FD1
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-84175995D3B9E4446FC83FD1
claim_key: CLAIM-E8B10134238EFAB6
claim_text: Kibi must expose strict public impact review preparation through the installed CLI and MCP for the complete staged scope or two explicitly selected immutable commits
rule_hash: 84175995d3b9e4446fc83fd1d8d04df83dd0a1a202de80a277e7e085ccf47667
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-84175995D3B9E4446FC83FD1
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: public_review_preparation_scope
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: installed_cli
        type: policy_scope
      - kind: const
        value: installed_mcp
        type: policy_scope
      - kind: const
        value: strict_staged_or_explicit_immutable_diff_scope
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 0
claim_span_end: 165
id: FACT-RULE-DFD15DB6A2E0E50B
type: fact
---
