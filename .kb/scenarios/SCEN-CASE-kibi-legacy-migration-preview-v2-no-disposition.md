---
title: A legacy migration preview that drops an assertive sentence without a disposition fails the coverage guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:42.694Z'
id: SCEN-CASE-kibi-legacy-migration-preview-v2-no-disposition
type: scenario
---
Given legacy requirement prose with three assertive sentences and one nonlogical example, when the read-only legacy migration preview is built, then every sentence of the authored prose appears as a proposition bound to its exact span with one disposition from the allowed set, and the assertive count matches, so a sentence left without a disposition fails the guard.

The test case packages/cli/tests/operations/legacy-migration-plan.test.ts "leaves no assertive sentence of the authored prose without a disposition" exercises it. It covers the value below the bound of dispositions per assertive proposition, `lt 1`.