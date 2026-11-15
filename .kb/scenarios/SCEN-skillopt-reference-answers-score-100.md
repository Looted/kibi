---
title: A case's reference answer scores 100 against the staged server
status: active
tags:
  - skillopt
  - scoring
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: SCEN-skillopt-reference-answers-score-100
type: scenario
---
Given a kibi-usage case staged with its evaluator-owned fixture, when its registered reference answer makes real MCP calls against the staged Kibi server and the evidence is scored the way a paid cell is scored, then it scores 100 and `verify.ts --skill kibi-usage` reports the case as passing.

scripts/skillopt-eval/tests/reference-verify.test.ts exercises it.