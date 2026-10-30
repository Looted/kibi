---
title: The schema upgrade pins asserted on a firm requirement without a proof path
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:44.047Z'
id: SCEN-CASE-kibi-evidence-floors-UNPINNED-FIRM
type: scenario
---
Given a KB downgraded to schema 10 that holds firm requirements without a proof path and without required_evidence, when kibi migrate --yes runs, then it records required_evidence asserted on each of them and the upgraded KB passes the evidence-floor rule.

This covers the edge case of one unpinned firm requirement without a proof path, the value past the bound `gt 0`: the upgrade pins it instead of leaving it to fail later. documentation/tests/e2e/packed/evidence-floors.test.ts "records the floor of firm requirements without a proof path on upgrade" exercises it.
