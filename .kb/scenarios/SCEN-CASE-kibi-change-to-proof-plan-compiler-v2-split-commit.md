---
title: A compile plan whose last file publish fails lands nothing and later applies in one commit
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:29.016Z'
id: SCEN-CASE-kibi-change-to-proof-plan-compiler-v2-split-commit
type: scenario
---
Given a compiled plan whose last relationship shard cannot be published, when the consumer CLI applies it, then the application fails, the store holds none of its entities and every published file is restored from the journal; with the obstruction removed, the same plan applies every entity and relationship in one application.

packages/cli/tests/consumer/plan-apply-atomic.test.ts "lands every entity of a compiled plan in one commit and leaves nothing half-written when a file publish fails" exercises this edge case through the kibi CLI. It covers a plan application split over more than one commit, `store_transactions_per_plan_application gt 1`.
