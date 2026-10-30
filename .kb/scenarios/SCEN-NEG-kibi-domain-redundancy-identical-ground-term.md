---
title: Two requirements grounding the same logical term are reported as domain-redundancy with exact witnesses
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:11:44.139Z'
id: SCEN-NEG-kibi-domain-redundancy-identical-ground-term
type: scenario
---
Given two current requirements whose facts state the same session lifetime, one in minutes and one in seconds, when the packed CLI runs `kibi check` with the domain-redundancy rule, then the pair does not pass silently: it is reported as an advisory domain-redundancy finding whose witness names both facts and the shared canonical signature.

This is the failure side of domain redundancy: duplicate grounding of one term must surface so authors can merge or restate the pair. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "reports advisory redundancy, vocabulary, and naming findings and reuses subjects" exercises it.
