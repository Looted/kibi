---
title: SkillOpt family judged on pooled pass rate schema
status: active
fact_kind: predicate_schema
predicate_name: judged_on_pooled_pass_rate_against_noise_floor
predicate_namespace: default
predicate_arity: 1
argument_names:
  - family
argument_types:
  - skillopt_family
argument_descriptions:
  - A SkillOpt task family in the campaign no-regression gate.
examples:
  - judged_on_pooled_pass_rate_against_noise_floor(intent_consult)
tags:
  - lane:ontology
  - predicate-schema
  - skillopt
origin:
  kind: agent
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-SCHEMA-SKILLOPT-FAMILY-JUDGED-ON-POOLED-RATE
type: fact
---
A SkillOpt family is judged by the no-regression gate on its pooled pass rate against the baseline-against-baseline noise floor.