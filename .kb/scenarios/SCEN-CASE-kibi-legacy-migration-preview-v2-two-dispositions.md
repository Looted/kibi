---
title: A legacy migration preview that gives one proposition two dispositions fails the disposition guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:26.059Z'
id: SCEN-CASE-kibi-legacy-migration-preview-v2-two-dispositions
type: scenario
---
Given legacy requirement prose that mixes a strict property, a predicate-shaped sentence and a nonlogical example, when the read-only legacy migration preview is built, then every proposition has a unique claim key and span and exactly one disposition whose recommended lane matches it, so a proposition reported twice or with two dispositions fails the guard.

The test case packages/cli/tests/operations/legacy-migration-plan.test.ts "never gives one proposition two dispositions" exercises it. It covers the value past the bound of dispositions per assertive proposition, `gt 1`.