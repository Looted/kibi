---
title: An invalid payload in an approved bootstrap plan is rejected before any journal or entity write
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:29.917Z'
id: SCEN-NEG-bootstrap-write-safety-INVALID-PAYLOAD-APPLY
type: scenario
---
Given an approved bootstrap plan with a valid hash whose single action upserts a fact missing required fields, when the plan is applied, then the apply fails with BOOTSTRAP_PLAN_INVALID, not retryable, and neither a recovery journal nor the fact file is written.

This is the failure side of the apply preflight: an invalid payload must be caught before anything is committed. packages/cli/tests/operations/apply-plan.test.ts "a correctly hashed invalid payload is rejected before any journal or source write" exercises it.
