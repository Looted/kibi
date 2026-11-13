---
title: A skill loaded with kibi skills load marks later operations in that workspace
status: active
tags:
  - telemetry
  - cli
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: SCEN-kibi-telemetry-skill-load-routes
type: scenario
---
Given two initialized workspaces with telemetry on and a local collector, when `kibi status` runs, then `kibi skills load kibi-usage`, then `kibi status` again in the first workspace, the events arrive in that order with `skill_loaded_before` false, false and true, and nothing sent holds either workspace path.

packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts "a skill loaded through the CLI marks later operations in that workspace" exercises it.