---
title: A failed compile plan publish restores every written file from the journal it recorded first
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:44.078Z'
id: SCEN-CASE-kibi-change-to-proof-plan-compiler-v2-unjournaled-write
type: scenario
---
Given a compiled plan whose last file publish fails after every earlier file was written, when the consumer CLI applies it, then the error reports how many source files were restored from the named journal, that count equals every file written before the failure, and the journal records the plan hash and its rollback.

packages/cli/tests/consumer/plan-apply-atomic.test.ts "lands every entity of a compiled plan in one commit and leaves nothing half-written when a file publish fails" exercises this edge case through the kibi CLI. It covers one write without a prior journal entry, `writes_without_prior_journal_entry gt 0`.
