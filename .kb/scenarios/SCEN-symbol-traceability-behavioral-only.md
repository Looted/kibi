---
title: A config record without an implements link raises no traceability finding
status: active
expects: success
tags:
  - symbols
  - traceability
  - coverage
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-symbol-traceability-behavioral-only
type: scenario
---
Given a config-role symbol record with no implements link next to a linked behavioral symbol, when kibi check runs, then neither symbol-traceability nor symbol-coverage reports the config record.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.