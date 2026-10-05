---
title: Agent-written entities are marked agent-authored and unreviewed approvals stay visible
status: active
priority: must
tags:
  - origin
  - provenance
  - approval
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:18.167Z'
id: SCEN-kibi-entity-origin
type: scenario
---
# Agent-written entities are marked agent-authored and unreviewed approvals stay visible

Given an agent writes a new requirement through `kb_upsert` without `origin`
When the write commits
Then the requirement records `origin: {kind: agent, recorded_at: <write time>}`
And a later update without `origin` leaves it unchanged.

Given a payload whose origin has an unknown kind or field
When `kb_upsert` runs
Then it is rejected before anything is written.

Given an exception that exempts a requirement without `approved_by`, an agent-recorded approval without `origin.approved_by` or `approval_ref`, and an agent-authored current requirement without `origin.approved_by`
When `kb_check` runs
Then it reports each as a non-blocking quality diagnostic.
