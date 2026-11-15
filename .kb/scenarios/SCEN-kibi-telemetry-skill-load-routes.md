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
Given two initialized workspaces with telemetry on and a local collector, one of them inside a plain parent directory, when `kibi status` runs in that workspace, then `kibi skills load kibi-usage` in the parent directory, then `kibi status` in the workspace, then `kibi skills load kibi-usage` from a subdirectory of the workspace, then `kibi status` in the workspace and in the second workspace, the events arrive in that order with `skill_loaded_before` false, false, false, false, true and false, and nothing sent holds either workspace path.

The same holds for the MCP server: started in the parent directory, a skill loaded there does not count for a workspace below it, and a skill loaded through a call routed to a workspace counts for later calls routed to that workspace and for no sibling workspace.

packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts "a skill loaded through the CLI marks later operations in that workspace" and packages/mcp/tests/server/skill-load-telemetry-routing.test.ts exercise it.
