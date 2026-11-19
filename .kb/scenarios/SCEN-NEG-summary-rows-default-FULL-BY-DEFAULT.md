---
title: 'Failure side: kb_coverage and kb_query list summary rows by default'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-summary-rows-default-FULL-BY-DEFAULT
type: scenario
---
Given the same calls, full rows returned without fields full fail the unit tests' assertions.

## Context

The failure side of REQ-summary-rows-default.