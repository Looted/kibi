---
title: A three-word participant taken from the claim stays bound, so a limit below three words fails the binding check
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:04:39.711Z'
id: SCEN-CASE-model-predicates-binding-clauses-two-word-limit
type: scenario
---
Given the claim "Archiving a page while publishing a revision must not delete previously approved comments.", when predicate modeling matches the permission_rule schema, then the seven-word actor clause is unbound while the three-word resource previously_approved_comments keeps its extracted binding, so a participant limit under three words that unbinds it fails the check.

The test case packages/cli/tests/operations/predicate-binding-placeholders.test.ts "an extracted actor longer than three words is unbound with a hint" exercises it. It covers the value below the bound of the bound participant word limit, `lt 3`.