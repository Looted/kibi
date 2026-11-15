---
title: 'Rule: Every SkillOpt case shall have a reference answer that the scorer rates at 100'
status: active
fact_kind: rule
rule_ir:
  version: kibi.logic.v1
  kind: rule
  modality: oblige
  head:
    kind: atom
    name: reference_answer_scores_100
    args:
      - kind: var
        name: V1
        type: skillopt_case
  body:
    kind: atom
    name: skillopt_case_in_catalog
    args:
      - kind: var
        name: V1
        type: skillopt_case
  variables:
    - name: V1
      type: skillopt_case
      quantifier: forall
rule_hash: e85c2ec4adee199f21d7965728555acf5621fbf227723e345bbc95045e246301
semantic_key: SEM-E85C2EC4ADEE199F21D79657
rule_schema_id: FACT-RULE-SCHEMA-LOGIC-V1
rule_name: kibi.logic.v1
canonical_key: SEM-E85C2EC4ADEE199F21D79657
claim_key: CLAIM-C131F88C8E06DC3A
claim_text: Every SkillOpt case shall have a reference answer that the scorer rates at 100
claim_span_start: 0
claim_span_end: 78
tags:
  - lane:logic
  - logic-ir-v1
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-RULE-4CA3241DB4F4EE49
type: fact
---
Every SkillOpt case in the catalog has a reference answer that the scorer rates at 100. Grounds the quantified claim of REQ-skillopt-reference-answers-score-100.