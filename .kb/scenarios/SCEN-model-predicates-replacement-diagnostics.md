---
title: A grounding replacement plan names its transient kb_check findings and its rollback condition
status: active
tags:
  - modeling
  - predicates
  - replacement-plan
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K20'
  recorded_at: '2026-10-09T07:20:42.842Z'
id: SCEN-model-predicates-replacement-diagnostics
type: scenario
---
Given a requirement already grounded by a property fact and a kb_model mode predicates suggestion that replaces that grounding, when the replacementPlan is returned, then its machine-readable expected field lists an empty finding set after the first step, both logic-coverage and strict-req-fact-pairing after the retraction step and an empty set after the last step, its rollback step applies only when kb_check after the last step is not clean, and its instructions say the same in prose; the steps keep their order and running them against a live KB produces exactly those findings after each step.