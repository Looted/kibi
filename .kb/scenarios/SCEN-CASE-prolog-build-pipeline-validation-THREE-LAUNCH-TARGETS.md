---
title: A build workflow missing one launch target's build or smoke job fails the workflow contract
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:50:02.410Z'
id: SCEN-CASE-prolog-build-pipeline-validation-THREE-LAUNCH-TARGETS
type: scenario
---
Given the SWI-Prolog build workflow, when the build-archive or smoke-archive matrix drops one of the four launch targets, then the workflow contract check fails because the matrix targets no longer equal the four launch targets.

This covers the value below the bound, `lt 4` on `launch_targets_with_separate_build_and_smoke_jobs`. scripts/tests/swipl-build-pipeline.test.ts "builds and independently consumes exactly the four launch targets" exercises it: a missing target leaves the sorted matrix targets short of the literal four-target list.
