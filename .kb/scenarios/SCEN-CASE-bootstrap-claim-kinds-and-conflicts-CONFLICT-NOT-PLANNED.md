---
title: A declared conflict between two claims is planned as a cited review:conflict fact
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:32.104Z'
id: SCEN-CASE-bootstrap-claim-kinds-and-conflicts-CONFLICT-NOT-PLANNED
type: scenario
---
Given two declared intent claims and a declared conflict between them, when the bootstrap planner builds the plan, then the conflict is planned as a cited observation fact tagged review:conflict that cites every claim, and dropping the conflict changes the plan hash, so a conflict left out of the plan is caught.

This covers one violating item past the invariant, `gt 0` on `declared_conflicts_not_planned_as_review_facts`. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "a declared conflict becomes a review:conflict fact citing every claim, and is hash-bound" exercises it through the bootstrap planner.
