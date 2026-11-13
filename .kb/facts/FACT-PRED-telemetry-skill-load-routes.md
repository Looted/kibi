---
title: 'Predicate: conditional_behavior(telemetry_event,cli_or_mcp_skill_load,mark_workspace_skill_loaded_before)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - cli_or_mcp_skill_load
  - mark_workspace_skill_loaded_before
canonical_key: conditional_behavior(telemetry_event,cli_or_mcp_skill_load,mark_workspace_skill_loaded_before)
polarity: assert
claim_key: CLAIM-CFA8BB80BC91B4C8
claim_text: A Kibi skill loaded through the CLI or the MCP server shall mark the workspace for skill_loaded_before the same way a skill load seen by a host hook does
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - telemetry
  - privacy
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: FACT-PRED-telemetry-skill-load-routes
type: fact
---
A Kibi skill loaded through the CLI or the MCP server shall mark the workspace for skill_loaded_before the same way a skill load seen by a host hook does. Grounds the clause of REQ-kibi-telemetry-skill-load-routes as a conditional behavior of telemetry events.