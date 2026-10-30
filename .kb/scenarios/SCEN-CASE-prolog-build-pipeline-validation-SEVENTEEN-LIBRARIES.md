---
title: A consumer smoke that skips one of the 18 required libraries fails the smoke control
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:50:14.842Z'
id: SCEN-CASE-prolog-build-pipeline-validation-SEVENTEEN-LIBRARIES
type: scenario
---
Given an extracted SWI-Prolog prefix with all 18 required libraries, when the consumer smoke loads only 17 of them, then the smoke control fails because every pinned library must be loaded with use_module and reported as a passed library check.

This covers the value below the bound, `lt 18` on `consumer_smoke_required_libraries_checked`. scripts/tests/swipl-build-pipeline.test.ts "uses isolated absolute smoke execution and preserves success" exercises it: it asserts a use_module goal and a passed report entry for each of the 18 pinned libraries.
