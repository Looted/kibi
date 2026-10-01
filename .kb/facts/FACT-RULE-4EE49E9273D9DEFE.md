---
title: atom rule SEM-D8A42C8A36AB54E1B4760AD7
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-D8A42C8A36AB54E1B4760AD7
claim_key: CLAIM-FE52FF4413708776
claim_text: Kibi must return deterministic equivalent preparation data through the installed CLI and MCP for the same captured scope
rule_hash: d8a42c8a36ab54e1b4760ad746fc5909daa8348443172204b4c0b4b0f9684c34
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-D8A42C8A36AB54E1B4760AD7
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: public_review_preparation_peer_parity
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: same_captured_scope
        type: policy_scope
      - kind: const
        value: deterministic_cli_mcp_equivalence
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 645
claim_span_end: 765
id: FACT-RULE-4EE49E9273D9DEFE
type: fact
---
