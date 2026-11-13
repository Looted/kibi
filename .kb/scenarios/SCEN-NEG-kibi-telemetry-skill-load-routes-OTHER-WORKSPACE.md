---
title: A skill load in one workspace does not mark another
status: active
expects: rejection
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: SCEN-NEG-kibi-telemetry-skill-load-routes-OTHER-WORKSPACE
type: scenario
---
Given a skill loaded with `kibi skills load` in one workspace, when `kibi status` runs in a second workspace, then its event reports `skill_loaded_before` false.

This is the failure side of the marker: a load that marked every workspace would report skill use where no skill was read. packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts "a skill loaded through the CLI marks later operations in that workspace" exercises it.