---
title: The live change-to-proof evaluation refuses a malformed gold fixture instead of scoring it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:00:02.601Z'
id: SCEN-NEG-kibi-change-to-proof-evaluation-MALFORMED-GOLD
type: scenario
---
Given a search gold file whose second record is truncated, when scripts/change-to-proof-eval.ts --live runs over it with the shipped compile gold file, then the run exits non-zero, names the file and line 2 as invalid JSONL, and prints no metrics.

This is the failure side of deterministic, reviewable evaluation fixtures: a damaged fixture must stop the evaluation rather than be scored partially. scripts/tests/change-to-proof-eval.test.ts "the live run refuses a malformed gold fixture with its line and prints no metrics" exercises it as a step of the live evaluation proof.
