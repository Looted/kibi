---
title: A coverage page that omits actionable requirements yields a partial repair plan with the excluded count
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:23.000Z'
id: SCEN-NEG-kibi-dependency-ordered-repair-plan-paginated-plan
type: scenario
---
Given a workspace with more actionable requirements than the requested coverage page holds, when the packed CLI emits the requirement repair plan, then it refuses to present the plan as complete: the plan status is partial, scope.complete is false, and excludedByPagination counts the omitted requirement.

This is the failure side of the repair plan: pagination must fail closed so a caller never believes every gap was planned when some were cut off. documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "fails pagination closed and orders non-auto-applicable batches without writes" exercises it.
