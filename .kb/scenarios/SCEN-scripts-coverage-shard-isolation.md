---
title: Scripts shard exposes complete isolated coverage configuration
status: active
tags:
  - coverage
  - testing
  - scripts
  - ci
text_ref: scripts/run-unit-coverage.ts
id: SCEN-scripts-coverage-shard-isolation
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Given the current scripts/tests inventory, reading the scripts coverage shard configuration lists each matching test/spec path recursively, appends test/root-summary.test.ts once, and requests process-per-file isolation. This scenario checks configured work, not successful completion of all subprocesses.