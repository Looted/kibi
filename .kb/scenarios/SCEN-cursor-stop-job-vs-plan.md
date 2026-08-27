---
id: SCEN-cursor-stop-job-vs-plan
title: Stop hook stays silent after plan delivery unless the turn edited source or mutated the KB
type: scenario
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/scenarios/SCEN-cursor-stop-job-vs-plan.md
tags:
  - scenario
  - cursor
  - plugin
  - hooks
links:
  - type: verified_by
    target: TEST-cursor-stop-job-vs-plan
  - type: relates_to
    target: REQ-cursor-stop-job-vs-plan
---

## Scenario: Plan-only turn stays silent

**Given** a Cursor agent loop that reads or searches source files and then calls `CreatePlan`
**When** the `stop` hook runs with status `completed`
**Then** it emits no `followup_message`

## Scenario: Plan delivery with source edits still follows up

**Given** the same loop also used a known editable tool on a source path
**When** the `stop` hook runs
**Then** it still emits the impact-enabled `kb_check` follow-up

## Scenario: Plan delivery with KB mutations still follows up

**Given** the same loop also called `kb_upsert` or `kb_delete`
**When** the `stop` hook runs
**Then** it still emits the short KB-updated follow-up
