---
title: 'Failure side: a list or report read over 64,000 characters is refused'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-ceiling-OVER-CEILING
type: scenario
---
Given the same read, a result returned with more than 64,000 characters of data fails the unit tests' assertions.

## Context

The failure side of REQ-result-ceiling.