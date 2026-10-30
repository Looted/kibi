---
title: Ontology-quality reports nothing for a predicate with fewer facts than the configured minimum
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:03.229Z'
id: SCEN-NEG-kibi-ontology-quality-BELOW-MINIMUM
type: scenario
---
Given a predicate whose three facts all use one-off argument values, when kibi check runs ontology-quality with a minimum of four facts, then no ontology-quality finding is reported, while the same KB checked with a minimum of three reports the predicate once.

This is the failure side of the minimum fact count: a small vocabulary must be kept out of the informational findings instead of being reported as noise. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "skips ontology-quality for a predicate with fewer facts than the configured minimum" exercises it.
