---
title: A refused .kb/ read costs only the isolation points
status: active
tags:
  - skillopt
  - scoring
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: SCEN-skillopt-refused-kb-read-not-critical
type: scenario
---
Given a host file read of `.kb/requirements/REQ-a.md` whose completion reports `status: failed`, when the transcript is normalized and the cell is scored, then no `direct_kb_access` violation is recorded, `deniedKbReads` is 1, and a cell that otherwise scores 100 scores 85.

scripts/skillopt-eval/tests/codex-events.test.ts and scripts/skillopt-eval/tests/denied-kb-read-score.test.ts exercise it.