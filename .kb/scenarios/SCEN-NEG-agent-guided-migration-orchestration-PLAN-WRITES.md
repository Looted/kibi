---
title: Building a migration plan leaves every tracked file unchanged
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T08:10:00.000Z'
id: SCEN-NEG-agent-guided-migration-orchestration-PLAN-WRITES
type: scenario
---
Given a packed CLI workspace with two requirements that need migration work, when `kibi status`, `kibi check`, `kibi coverage --by req` and a `kibi migrate` preview run with JSON output, then each migration plan they return is a kibi.migration-plan.v2 plan with a 64-character planHash, and Git status and the bytes of every tracked file are the same as before.

This is the failure side of read-only checks and status: an agent must be able to read the plan without changing the repository it describes. documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "builds migration plans from status, check and coverage without changing a tracked file" exercises it.
