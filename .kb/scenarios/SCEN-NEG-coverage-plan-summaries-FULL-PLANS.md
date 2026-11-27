---
title: 'Failure side: kb_coverage returns its plans as summaries by default'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-coverage-plan-summaries-FULL-PLANS
type: scenario
---
Given the same call, full plans returned without fields full fail the unit tests' assertions.

## Context

The failure side of REQ-coverage-plan-summaries.