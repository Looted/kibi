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
The aggregate job is skipped when a needed job fails, or treats a skipped or cancelled job as success without a recorded same-tree reuse, or misses a job of the workflow, so a ruleset requiring it lets a pull request merge without that job passing.

A skip is allowed only when the reuse job succeeded and recorded that this checkout's git tree is a tree a member pull request already passed. Every other skip fails the aggregate.

This is the failure side the aggregate jobs must not produce; scripts/tests/required-checks-workflow-contract.test.ts checks it.
