---
title: Operator runs a SkillOpt campaign on the harness chosen for the run, and evidence stays with its harness
status: active
tags:
  - skillopt
  - harness
  - evaluation
expects: success
origin:
  kind: human
  ref: 'Maintainer decision, 2026-10-21: "Make SkillOpt treat the agent harness as an explicit per-run choice, finish the leftovers of the bundle removal, and record missing protocol calls."'
  recorded_at: '2026-10-21T10:52:45.971Z'
id: SCEN-skillopt-host-neutral-optimization
type: scenario
---
Given an operator who chooses the agent harness for a SkillOpt run with `--host` or `KIBI_SKILLOPT_HOST`
When a campaign evaluates candidates on that harness and a candidate cell skips a required MCP call
Then `campaign.json`, the evaluation context and the package receipt record the harness and its CLI version
And each such cell's receipt names the first missing required call by public tool name and position only
And the public feedback written for the next revision names that call without task, fixture or evaluator content
And `confirm` and `package --evaluation` on another harness refuse that evidence before any artifact or paid preparation
And `--host` wins over `KIBI_SKILLOPT_HOST`, an unknown harness exits 2, and the Codex-only `cli.ts` and `operator.ts` workflow refuses another harness with exit 2
And the offline workflow contracts are at schema version 1.1.0 without an assembled-bundle gate, phase or result