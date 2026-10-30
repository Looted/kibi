---
title: A near restatement of a current requirement is flagged with a review diagnostic naming it
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:28.530Z'
id: SCEN-CASE-bootstrap-claim-restatement-NEAR-RESTATEMENT
type: scenario
---
Given a current requirement and a declared intent claim whose token overlap with its semantic text is high but not exact, when the bootstrap planner runs, then the claim stays planned and the plan carries a possible_restatement diagnostic that names the requirement and asks for review before apply.

This covers the edge case of one close restatement, the value past the bound `gt 0`: Kibi reports it instead of letting it pass silently. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "a near restatement is planned with a review signal naming the requirement" exercises it.
