---
title: A requirement with an unmodeled clause gets an incomplete contradiction stage instead of no conflict found
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:17:06.780Z'
id: SCEN-NEG-kibi-truthful-consistency-UNMODELED-CLAUSE
type: scenario
---
Given a requirement whose numeric clause is grounded and whose review clause is recorded as an ontology gap, and no conflicting requirement in the KB, when requirement coverage runs, then the contradiction stage is unresolved with the analysis incomplete outcome and the contradiction_check_incomplete gap, never passed with no conflict found.

This is the failure side of truthful consistency: the absence of a found conflict over a partial model must not be reported as safety. packages/cli/tests/consumer/truthful-consistency.test.ts "reports incomplete analysis for unmodeled clauses and exact strict-bound conflicts" exercises it.
