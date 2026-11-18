---
title: A non-behavioral role does not excuse a function
status: active
expects: rejection
tags:
  - negative-path
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-behavioral-kinds-keep-implements-ROLE-EXCUSES-FUNCTION
type: scenario
---
Given a structural-role record for a new function and a config-role record for a new constant whose value is an arrow function, both without an implements link, then kibi check --staged blocks the commit with Traceability failed naming both.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.