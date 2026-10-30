---
title: A governing requirement answered without its approved exception or its unknowns is caught
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:11.583Z'
id: SCEN-CASE-kibi-search-answer-layer-v2-REQ-WITHOUT-EXCEPTIONS
type: scenario
---
Given a governing requirement with an approved exception requirement and a clause recorded as an ontology gap, when kibi search answers a question about it, then the answer lists the exception with its approver and the ungrounded clause under unknowns, and an answer that left either out fails the consumer check.

This covers one violating item past the invariant, `gt 0` on `governing_requirements_without_exceptions_and_unknowns`. packages/cli/tests/consumer/search-answer-layer.test.ts "gives each governing requirement its verdict, exceptions, unknowns and rationale excerpt, scoped to the synced snapshot" exercises it by asserting the exact exception list with its approver and the unresolved_proposition unknown.
