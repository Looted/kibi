---
title: 'Predicate: conditional_behavior(skillopt_cell_score,completed_kb_read_or_kb_command_or_kb_write,critical_failure)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - skillopt_cell_score
  - completed_kb_read_or_kb_command_or_kb_write
  - critical_failure
canonical_key: conditional_behavior(skillopt_cell_score,completed_kb_read_or_kb_command_or_kb_write,critical_failure)
polarity: assert
claim_key: CLAIM-787B4AAFBEC70AED
claim_text: A read that succeeded, a shell command naming .kb/, and any write to .kb/ stay critical
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - skillopt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-PRED-skillopt-kb-access-critical
type: fact
---
A read that succeeded, a shell command naming .kb/, and any write to .kb/ stay critical. Grounds a clause of REQ-skillopt-refused-kb-read-not-critical as a conditional behavior of SkillOpt cell scoring.