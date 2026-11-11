---
title: Advisory partitioning and Prolog redundancy, implication, and scaling suites
status: passing
verification_scope: unit
tags:
  - vocabulary-convergence
id: TEST-kibi-domain-redundancy
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
Besides the rule's cases, a scaling suite grows the KB from 40 to 160 requirements and requires inference to grow less than tenfold. The rule groups by key instead of comparing every pair.
