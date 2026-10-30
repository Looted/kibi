---
title: Applying a bootstrap plan that is not approved as ready is refused before any mutation
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:09.435Z'
id: SCEN-NEG-KIBI-BOOTSTRAP-PLAN-UNAPPROVED-APPLY
type: scenario
---
Given a bootstrap plan whose status is needs_context rather than ready, when kb_apply_plan is asked to apply it with its own plan hash, then the apply is refused with a message that only ready plans may be applied and no upsert is committed.

This is the failure side of the explicit approval rule for bootstrap: a plan cannot reach the knowledge base without being approved as ready. packages/cli/tests/operations/apply-plan.test.ts "rejects an unapproved BootstrapPlanV1 before mutation" exercises it.
