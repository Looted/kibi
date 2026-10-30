---
title: A scripts coverage shard that lists the root summary test twice fails its contract test
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:27.047Z'
id: SCEN-CASE-scripts-coverage-shard-isolation-summary-twice
type: scenario
---
Given the scripts coverage shard configuration, when the unit coverage runner contract test reads it, then its path list must equal the discovered scripts tests followed by test/root-summary.test.ts exactly once, so a second inclusion of the root summary fails the test.

scripts/tests/unit-coverage-runner.test.ts "owns SkillOpt and scripts tests in dedicated coverage shards" exercises this edge case by comparing the whole path list. It covers the value past the bound, `root_summary_inclusions_after_script_tests gt 1`.
