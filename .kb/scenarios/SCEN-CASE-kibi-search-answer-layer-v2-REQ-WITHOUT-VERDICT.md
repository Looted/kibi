---
title: A governing requirement answered without its contradiction verdict and witnesses is caught
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:18.061Z'
id: SCEN-CASE-kibi-search-answer-layer-v2-REQ-WITHOUT-VERDICT
type: scenario
---
Given two current requirements whose property facts on the same subject contradict, when kibi search answers a question about them, then each governing requirement carries the contradiction verdict and the domain-contradiction witness naming the other requirement, and an answer that dropped either fails the consumer check.

This covers one violating item past the invariant, `gt 0` on `governing_requirements_without_verdict_and_witnesses`. packages/cli/tests/consumer/search-answer-layer.test.ts "gives each governing requirement its verdict, exceptions, unknowns and rationale excerpt, scoped to the synced snapshot" exercises it by asserting the verdict status and the mirror witnesses of both requirements.
