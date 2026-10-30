---
title: Adopting a candidate from local evidence without an approved verdict is refused
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:58.395Z'
id: SCEN-CASE-skillopt-host-neutral-optimization-UNAPPROVED-ADOPTION
type: scenario
---
Given a SkillOpt run with only local review evidence and no external verdict approving the exact candidate, when the operator runs the adopt command without the offline review flag, then it exits 2 naming the review lane, the review lane only returns a dry-run plan, and the canonical skill surface is unchanged.

This covers the edge case of one adoption without passing gates and exact approval, the value past the bound `gt 0`. documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts, in its part 3 where local evidence stays review-only, exercises it through the real CLI.
