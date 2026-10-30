---
title: A build workflow with build and smoke jobs for a fifth target fails the workflow contract
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:49:57.396Z'
id: SCEN-CASE-prolog-build-pipeline-validation-FIVE-LAUNCH-TARGETS
type: scenario
---
Given the SWI-Prolog build workflow, when its build-archive or smoke-archive matrix gains a row for a target beyond the four launch targets, then the workflow contract check fails because the matrix targets must equal exactly linux-x64-gnu, linux-arm64-gnu, darwin-arm64 and darwin-x64.

This covers the value past the bound, `gt 4` on `launch_targets_with_separate_build_and_smoke_jobs`. scripts/tests/swipl-build-pipeline.test.ts "builds and independently consumes exactly the four launch targets" exercises it: it compares the sorted matrix targets of both job kinds with the literal four-target list.
