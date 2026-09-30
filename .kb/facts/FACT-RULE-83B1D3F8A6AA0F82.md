---
title: atom rule SEM-891B629CDFBFF6FC6EF08018
status: active
tags:
  - lane:logic
  - logic-ir-v1
text_ref: documentation/impact-review-stage-e.md
canonical_key: SEM-891B629CDFBFF6FC6EF08018
claim_key: CLAIM-D7F08F67F0CB82AF
claim_text: Kibi must reject candidate policy weakening against the trusted target policy
rule_hash: 891b629cdfbff6fc6ef080180d80fa21b96ec8936b796bf55291471dd7fe314c
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: FACT-RULE-SCHEMA-LOGIC-V1
semantic_key: SEM-891B629CDFBFF6FC6EF08018
rule_ir:
  version: kibi.logic.v1
  kind: atom
  modality: oblige
  head:
    kind: atom
    name: aggregate_policy_weakening_rejection
    args:
      - kind: const
        value: kibi.impact_policy
        type: enforcement_surface
      - kind: const
        value: candidate_policy
        type: policy_scope
      - kind: const
        value: trusted_target_policy
        type: policy_scope
  ruleSchemaId: FACT-RULE-SCHEMA-LOGIC-V1
fact_kind: rule
claim_span_start: 1559
claim_span_end: 1636
id: FACT-RULE-83B1D3F8A6AA0F82
type: fact
---
