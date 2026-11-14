---
title: 'Predicate: conditional_behavior(skillopt_cell_score,host_refused_kb_read,isolation_points_lost_only)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - skillopt_cell_score
  - host_refused_kb_read
  - isolation_points_lost_only
canonical_key: conditional_behavior(skillopt_cell_score,host_refused_kb_read,isolation_points_lost_only)
polarity: assert
claim_key: CLAIM-436F5703622CE146
claim_text: A .kb/ read that the agent's host refused shall cost a SkillOpt cell its isolation points without counting as a critical failure
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - skillopt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-PRED-skillopt-refused-kb-read-isolation-only
type: fact
---
A .kb/ read that the agent's host refused shall cost a SkillOpt cell its isolation points without counting as a critical failure. Grounds a clause of REQ-skillopt-refused-kb-read-not-critical as a conditional behavior of SkillOpt cell scoring.