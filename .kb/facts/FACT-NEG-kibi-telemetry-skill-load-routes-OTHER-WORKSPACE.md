---
title: A skill load marks no workspace, or marks a workspace it did not run in
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - telemetry_event
  - cli_or_mcp_skill_load
  - mark_workspace_skill_loaded_before
canonical_key: conditional_behavior(telemetry_event,cli_or_mcp_skill_load,mark_workspace_skill_loaded_before)
polarity: deny
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-13T10:00:00.000Z'
id: FACT-NEG-kibi-telemetry-skill-load-routes-OTHER-WORKSPACE
type: fact
---
A skill loaded with `kibi skills load` leaves later operations in its workspace without `skill_loaded_before`, or a second workspace reports `skill_loaded_before` true.