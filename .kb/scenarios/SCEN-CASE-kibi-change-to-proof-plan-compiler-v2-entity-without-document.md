---
title: Every entity a compile plan commits survives a rebuild from its authored document
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:35.244Z'
id: SCEN-CASE-kibi-change-to-proof-plan-compiler-v2-entity-without-document
type: scenario
---
Given a compiled plan applied through the consumer CLI, when the workspace is staged and the store is rebuilt with kibi sync --rebuild, then every step document holds its entity id and every entity and relationship the plan committed is still there, so no committed entity is missing from its authored document.

packages/cli/tests/consumer/plan-apply-atomic.test.ts "lands every entity of a compiled plan in one commit and leaves nothing half-written when a file publish fails" exercises this edge case in its rebuild step. It covers one committed entity missing from its authored document, `committed_entities_missing_from_authored_documents gt 0`.
