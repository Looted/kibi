---
title: A completed .kb/ read or a shell command naming .kb/ stays critical
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
id: SCEN-NEG-skillopt-kb-access-REFUSED-COMMAND-FORGIVEN
type: scenario
---
Given a host file read of a `.kb/` path that returned content or never reported an outcome, or a shell command naming `.kb/` that failed, when the transcript is normalized, then `direct_kb_access` is recorded.

scripts/skillopt-eval/tests/codex-events.test.ts exercises it.