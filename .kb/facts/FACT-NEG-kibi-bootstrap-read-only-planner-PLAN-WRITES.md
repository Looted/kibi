---
title: Bootstrap planning writes to the workspace
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: kibi.bootstrap.plan
property_key: plan_is_deterministic_read_only_and_hash_bound
operator: eq
value_type: string
value_string: planning_writes_workspace
origin:
  kind: agent
  recorded_at: '2026-11-10T05:00:00.000Z'
id: FACT-NEG-kibi-bootstrap-read-only-planner-PLAN-WRITES
type: fact
---
The bootstrap planner writes or creates files while it builds a plan, or returns a plan whose hash does not match its contents.
