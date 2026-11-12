---
title: Building a bootstrap plan writes nothing and binds its hash to its contents
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T05:00:00.000Z'
id: SCEN-NEG-kibi-bootstrap-read-only-planner-PLAN-WRITES
type: scenario
---
Given a cold-start workspace exposed only through file system ports, when the shared bootstrap planner builds a plan, then the plan hash recomputed from the plan equals the returned planHash, and the planner never calls writeFile or mkdir.

This is the failure side of the read-only, hash-bound planner: planning must not change the workspace it inspects. packages/cli/tests/operations/bootstrap.test.ts "uses workspace ports, clamps limits, and preserves nested bootstrap context" exercises it, inside the TEST-KIBI-BOOTSTRAP-PLAN-APPLY proof run.
