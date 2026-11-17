---
title: A coveredBy test left unlinked fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - mutation
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: SCEN-NEG-kb-upsert-implemented-by-covered-by-UNLINKED
type: scenario
---
Given the same write, a symbol upsert that lacks the covered_by link to a coveredBy test fails the test's assertions.

## Context

The failure side of the coveredBy rule.