---
title: A requirement with several unresolved gap phases still gets only its earliest repair batch ready
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:24.645Z'
id: SCEN-CASE-kibi-dependency-ordered-repair-plan-two-ready-batches
type: scenario
---
Given two requirements that each have gaps in several repair phases, when the packed CLI emits the requirement repair plan, then only the first batch of each requirement (semantic_inventory) is ready and every later batch is blocked, so the plan never presents two ready batches for one requirement.

documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "fails pagination closed and orders non-auto-applicable batches without writes" exercises this edge case: it asserts that each requirement has more than one batch, that the first is ready and that every other batch is blocked. It covers the value past the bound, `ready_batches_per_requirement gt 1`.
