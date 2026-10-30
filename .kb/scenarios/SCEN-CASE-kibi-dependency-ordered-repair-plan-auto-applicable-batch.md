---
title: No repair batch is auto-applicable and each keeps the reviewed sequential write policy
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:39.919Z'
id: SCEN-CASE-kibi-dependency-ordered-repair-plan-auto-applicable-batch
type: scenario
---
Given a workspace whose requirements have proof gaps, when the packed CLI emits the repair plan, then every batch is marked not auto-applicable, and a source-coordinates batch keeps the review_then_sequential_upsert write policy with kb_query, kb_validate_upsert and kb_upsert as its first steps, while the plan run writes nothing to the KB.

documentation/tests/e2e/packed/dependency-ordered-repair-plan.test.ts "fails pagination closed and orders non-auto-applicable batches without writes" exercises this edge case: it asserts that no batch is autoApplicable and that the KB snapshot is unchanged after planning. It covers one batch that is auto-applicable or lacks a mutation safeguard, `batches_auto_applicable_or_missing_mutation_safeguards gt 0`.
