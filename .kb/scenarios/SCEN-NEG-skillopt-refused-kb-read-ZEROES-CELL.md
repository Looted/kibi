---
title: A refused .kb/ read does not zero the cell
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
id: SCEN-NEG-skillopt-refused-kb-read-ZEROES-CELL
type: scenario
---
Given a cell whose only `.kb/` read was refused by the host, when it is scored, then it does not score 0 for `direct_kb_access`.

This is the failure side of the rule: the old scorer matched the path of the attempt and zeroed a cell that accessed nothing. scripts/skillopt-eval/tests/codex-events.test.ts exercises it.