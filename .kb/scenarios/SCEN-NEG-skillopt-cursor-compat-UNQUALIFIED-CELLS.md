---
title: The cursor lane reports not-qualified and launches no cells when qualification fails
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:00:06.027Z'
id: SCEN-NEG-skillopt-cursor-compat-UNQUALIFIED-CELLS
type: scenario
---
Given a cursor qualification receipt with verdict no-go because no models are available, when the cursor compatibility gate runs for a candidate, then the report verdict is not-qualified, no evaluation cells are launched, and production adoption still needs an external verdict.

This is the failure side of gating paid evaluation on cursor qualification. scripts/skillopt-eval/tests/cursor-lane.test.ts "gate reports not-qualified without launching cells" exercises it as the first step of the cursor compatibility proof.
