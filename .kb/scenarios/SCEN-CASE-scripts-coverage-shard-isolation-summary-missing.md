---
title: A scripts coverage shard without the root summary test fails its contract test
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:33.726Z'
id: SCEN-CASE-scripts-coverage-shard-isolation-summary-missing
type: scenario
---
Given the scripts coverage shard configuration, when the unit coverage runner contract test reads it, then its path list must end with test/root-summary.test.ts after the discovered scripts tests, so a shard that leaves the root summary out fails the test.

scripts/tests/unit-coverage-runner.test.ts "owns SkillOpt and scripts tests in dedicated coverage shards" exercises this edge case by comparing the whole path list. It covers the value below the bound, `root_summary_inclusions_after_script_tests lt 1`.
