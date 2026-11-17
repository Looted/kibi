---
title: Each step of one kibi check saves its own analysis cache and drops the other steps' analyses fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
  - symbols
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
id: SCEN-NEG-check-analysis-cache-shared-EVICTS
type: scenario
---
Given the same run, a step that opens or saves a cache of its own, or a save before the symbol debt step has run, fails the test's assertions.

## Context

The failure side of REQ-check-analysis-cache-shared.