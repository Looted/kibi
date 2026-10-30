---
title: A rationale ADR in a search answer without its source path or decision excerpt is caught
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:04.198Z'
id: SCEN-CASE-kibi-search-answer-layer-v2-ADR-WITHOUT-EXCERPT
type: scenario
---
Given a governing requirement with a rationale ADR whose Decision section differs from its Context, when kibi search answers a question about the requirement, then the rationale entry carries the ADR's source path and an excerpt of its decision, and an answer whose rationale ADR lacked either fails the consumer check.

This covers one violating item past the invariant, `gt 0` on `rationale_adrs_without_source_or_decision_excerpt`. packages/cli/tests/consumer/search-answer-layer.test.ts "gives each governing requirement its verdict, exceptions, unknowns and rationale excerpt, scoped to the synced snapshot" exercises it by asserting the exact rationale entry with source and decision excerpt.
