---
title: A Kibi CLI run in a SkillOpt fixture environment queues no telemetry
status: active
tags:
  - skillopt
  - telemetry
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: SCEN-skillopt-harness-telemetry-silent
type: scenario
---
Given a git workspace, when the real `kibi status` runs with the environment SkillOpt fixture setup builds (`fixtureCliEnv`), then the local telemetry queue stays empty, while the same run with `KIBI_TELEMETRY=1` outside the harness queues an event.

scripts/skillopt-eval/tests/telemetry-env.test.ts "a Kibi CLI run in a fixture environment queues no telemetry (end to end)" exercises it.