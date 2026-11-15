---
title: 'Predicate: conditional_behavior(skillopt_reference_verification,case_reference_answer_below_100,verification_fails)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - skillopt_reference_verification
  - case_reference_answer_below_100
  - verification_fails
canonical_key: conditional_behavior(skillopt_reference_verification,case_reference_answer_below_100,verification_fails)
polarity: assert
claim_key: CLAIM-C38C774DF4BD9A22
claim_text: harness verification shall fail when any case's reference answer scores below 100
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - skillopt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: FACT-PRED-skillopt-reference-verification-fails
type: fact
---
harness verification shall fail when any case's reference answer scores below 100. Grounds a clause of REQ-skillopt-reference-answers-score-100 as a conditional behavior of SkillOpt harness verification.