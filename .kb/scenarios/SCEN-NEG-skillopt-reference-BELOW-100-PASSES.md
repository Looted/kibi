---
title: A reference answer below 100 fails the check
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
id: SCEN-NEG-skillopt-reference-BELOW-100-PASSES
type: scenario
---
Given a reference answer that skips the discovery search a case requires, when it runs against the staged server and is scored, then it scores below 100 and the reference check reports the case as failing, and `verify.ts` exits non-zero.

scripts/skillopt-eval/tests/reference-verify.test.ts exercises it.