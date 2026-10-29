---
title: Applying a migration with a plan hash that does not match the current plan is refused without writes
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:28:20.365Z'
id: SCEN-NEG-agent-guided-migration-orchestration-UNAPPROVED-PLAN-HASH
type: scenario
---
Given a repository with pending migration actions, when kibi migrate --apply-safe is run with an approved plan hash that is not the current plan's hash, then the command fails with a message to regenerate the plan and approve its current hash, and the KB snapshot and dirty state are unchanged.

This is the failure side of hash-bound migration plans: an apply must not run against a plan nobody approved. documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "refuses apply-safe for a plan hash that does not match the current migration plan" exercises it.
