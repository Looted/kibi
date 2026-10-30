---
title: Every returned requirement with proof gaps gets a read-only repair plan
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:48.832Z'
id: SCEN-CASE-kibi-dependency-ordered-repair-plan-requirement-without-plan
type: scenario
---
Given two requirements with proof gaps, when the packed CLI reports coverage for every requirement, then the repair plan is read-only, plans both requirements and leaves the KB snapshot unchanged, and a page that drops one of them is marked partial with the excluded count instead of looking complete.

documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "fails pagination closed and orders non-auto-applicable batches without writes" exercises this edge case: it asserts readOnly true, a requirement count of two, an unchanged snapshot and a partial plan for the cut page. It covers one returned gap requirement without a read-only plan, `returned_gap_requirements_without_read_only_repair_plan gt 0`.
