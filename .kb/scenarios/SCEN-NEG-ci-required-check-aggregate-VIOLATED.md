---
title: A skipped or missing job lets a pull request merge
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:19.896Z'
id: SCEN-NEG-ci-required-check-aggregate-VIOLATED
type: scenario
---
The aggregate job is skipped when a needed job fails, or treats a skipped or cancelled job as success, or misses a job of the workflow, so a ruleset requiring it lets a pull request merge without that job passing.

This is the failure side the aggregate jobs must not produce; scripts/tests/required-checks-workflow-contract.test.ts checks it.