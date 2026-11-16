---
title: The staged gate saves its scratch store after each write or evaluates every requirement's proof fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
  - staged
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
id: SCEN-NEG-staged-gate-scratch-store-SAVES
type: scenario
---
Given the same store and requirements, a write followed by kb_save, or an evidence floor evaluation of a requirement the commit does not stage, fails the test's assertions.

## Context

The failure side of REQ-staged-gate-scratch-store.