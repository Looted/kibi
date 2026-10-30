---
title: The bootstrap planner selects candidates with claims before provenance stubs listed ahead of them
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:44.578Z'
id: SCEN-CASE-bootstrap-provenance-stubs-STUB-SELECTED-FIRST
type: scenario
---
Given four provenance stub candidates listed before three candidates with claims and a discovered budget of five, when the bootstrap planner selects candidates, then all three candidates with claims are planned first, only two stubs fill the rest, and the two over_limit rows are both stubs.

This covers the value past the bound, `gt 0`, of the claim that no stub is selected before a candidate with a claim. packages/cli/tests/operations/bootstrap-provenance-stubs.test.ts "stubs take the discovered budget last and over_limit rows say which are stubs" exercises it.
