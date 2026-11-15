---
title: A reference answer below 100 passes verification
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - skillopt_reference_verification
  - case_reference_answer_below_100
  - verification_fails
canonical_key: conditional_behavior(skillopt_reference_verification,case_reference_answer_below_100,verification_fails)
polarity: deny
tags:
  - negative-path
  - skillopt
origin:
  kind: agent
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-NEG-skillopt-reference-BELOW-100-PASSES
type: fact
---
A case whose reference answer scores below 100, or that has no reference answer, is reported as passing by the reference check.