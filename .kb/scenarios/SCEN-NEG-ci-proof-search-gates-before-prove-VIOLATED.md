---
title: A search regression surfaces only after the full proof
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:17.381Z'
id: SCEN-NEG-ci-proof-search-gates-before-prove-VIOLATED
type: scenario
---
The gold-set gates run after kibi prove --all, so a one-minute search failure is reported half an hour into the run, or they share a runner with proof steps and fail on latency the search did not cause.

This is the failure side the proof workflow must not produce; scripts/tests/required-checks-workflow-contract.test.ts checks it.