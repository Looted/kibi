---
title: A case without a reference answer fails the check
status: active
expects: rejection
tags:
  - negative-path
  - skillopt
  - scoring
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: SCEN-NEG-skillopt-reference-CASE-UNREACHABLE
type: scenario
---
Given a SkillOpt case with no registered reference answer, when the reference check runs, then it reports the case as failing with 'no reference answer'.

scripts/skillopt-eval/tests/reference-verify.test.ts exercises it.