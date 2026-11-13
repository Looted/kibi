---
title: An operator environment that turns telemetry on does not reach harness children
status: active
expects: rejection
tags:
  - negative-path
  - skillopt
  - telemetry
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: SCEN-NEG-skillopt-harness-telemetry-silent-OPERATOR-OPT-IN
type: scenario
---
Given an operator environment with `KIBI_TELEMETRY=1`, when the harness builds a fixture CLI environment or starts a bounded child process (`runBoundedProcess`), then the child sees `KIBI_TELEMETRY=0` and the fixture CLI run queues no event.

This is the failure side of the rule: an inherited opt-in would send evaluation runs as release usage. scripts/skillopt-eval/tests/telemetry-env.test.ts "a Kibi CLI run in a fixture environment queues no telemetry (end to end)" exercises it.