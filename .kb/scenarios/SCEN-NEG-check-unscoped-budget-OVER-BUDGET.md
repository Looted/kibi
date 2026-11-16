---
title: An unscoped kb_check over its budget, or one that drops a blocking rule, fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: SCEN-NEG-check-unscoped-budget-OVER-BUDGET
type: scenario
---
Given the same findings, an unscoped kb_check result larger than 24,000 characters (with no debt list asked for), one that leaves a blocking rule out, or one whose count falls short fails the unit tests' assertions.

## Context

The failure side of the unscoped budget.