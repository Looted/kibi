---
title: The bootstrap skill does not leave the rule unstated or push a backfill
status: active
expects: rejection
tags:
  - negative-path
  - bootstrap
  - skills
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-bootstrap-states-staged-symbol-rule-SILENT-ON-SYMBOL-RULE
type: scenario
---
Given the same skill, it tells the agent never to invent a requirement link to pass the gate and not to backfill records for the debt unless the human asks.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.