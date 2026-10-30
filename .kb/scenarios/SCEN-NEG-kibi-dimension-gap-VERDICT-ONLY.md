---
title: A quantified claim grounded only on a boolean is refused the tested status
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-30T12:10:00.000Z'
id: SCEN-NEG-kibi-dimension-gap-VERDICT-ONLY
type: scenario
---
Given a requirement whose claim ranges over every loaded file and is grounded on a boolean that states only the verdict, when kibi coverage computes its proof, then it reports the dimension_unrepresented gap and the requirement is not tested.

This is the failure side of the gap itself: a verdict-only grounding must not pass as tested. packages/cli/tests/consumer/dimension-gap.test.ts "a boolean behind an every-claim leaves the gap until a count grounds it" exercises it.
