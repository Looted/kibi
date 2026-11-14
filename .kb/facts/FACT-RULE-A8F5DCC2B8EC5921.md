---
title: 'Rule: SkillOpt no-regression shall judge each family on its pooled pass rate over at least 16 cells per arm, compared with a baseline-against-baseline noise floor, not on single cells'
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: judged_on_pooled_pass_rate_against_noise_floor
    args:
      - kind: var
        name: V1
        type: skillopt_family
  body:
    kind: atom
    name: skillopt_family_in_no_regression_gate
    args:
      - kind: var
        name: V1
        type: skillopt_family
  variables:
    - name: V1
      type: skillopt_family
      quantifier: forall
rule_hash: 98b3e6d3e54f42800ef46e31d89f47be2e169c9897008f1fe3e250264ab333e6
semantic_key: SEM-98B3E6D3E54F42800EF46E31
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-98B3E6D3E54F42800EF46E31
claim_key: CLAIM-0DF8C52FCD2536F0
claim_text: SkillOpt no-regression shall judge each family on its pooled pass rate over at least 16 cells per arm, compared with a baseline-against-baseline noise floor, not on single cells
claim_span_start: 0
claim_span_end: 177
tags:
  - lane:logic
  - logic-ir-v1
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-RULE-A8F5DCC2B8EC5921
type: fact
---
Every SkillOpt family in the no-regression gate is judged on its pooled pass rate against the baseline-against-baseline noise floor. Grounds the quantified claim of REQ-skillopt-pooled-family-gate.