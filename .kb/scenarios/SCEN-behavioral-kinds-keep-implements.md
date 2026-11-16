---
title: A changed constant with a config record and no link passes
status: active
expects: success
tags:
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-behavioral-kinds-keep-implements
type: scenario
---
Given a config-role record with no implements link for a constant, when a commit changes the constant's value, then kibi check --staged passes and reports neither Traceability failed nor symbol-coverage.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.