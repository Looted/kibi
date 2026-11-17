---
title: A ruleset requires one check per workflow
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:18.298Z'
id: SCEN-ci-required-check-aggregate
type: scenario
---
The develop ruleset requires ci-required and proof-required. Each runs after every other job of its workflow, even when one fails or is skipped, and passes only when all of them succeeded, so renaming or splitting a job never leaves the ruleset waiting on a check that no longer reports.