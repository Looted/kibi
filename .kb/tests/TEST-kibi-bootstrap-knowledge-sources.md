---
title: Bootstrap planner consolidates cited intent claims from declared knowledge sources
status: passing
tags:
  - bootstrap
  - knowledge-sources
id: TEST-kibi-bootstrap-knowledge-sources
type: test
---
# Bootstrap knowledge sources

`packages/cli/tests/operations/bootstrap-intent-claims.test.ts` runs the public `kb_plan_bootstrap` operation on a thin repository with declared sources and claims and checks cited req candidates, follow-ups, stale suppression, undeclared-source diagnostics, plan-hash binding, and the missing-sources question.
