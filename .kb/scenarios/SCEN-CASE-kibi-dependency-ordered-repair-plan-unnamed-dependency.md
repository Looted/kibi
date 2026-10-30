---
title: Every blocked downstream repair batch names the batches it depends on
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:32.834Z'
id: SCEN-CASE-kibi-dependency-ordered-repair-plan-unnamed-dependency
type: scenario
---
Given two requirements whose repair plans have downstream batches after their first phase, when the packed CLI emits the repair plan, then every blocked downstream batch lists at least one dependency in dependsOn, so none is left without a named dependency.

documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "fails pagination closed and orders non-auto-applicable batches without writes" exercises this edge case: it asserts that every batch after the first of each requirement is blocked with a non-empty dependsOn list. It covers one downstream batch without a named dependency, `downstream_batches_without_named_dependencies gt 0`.
