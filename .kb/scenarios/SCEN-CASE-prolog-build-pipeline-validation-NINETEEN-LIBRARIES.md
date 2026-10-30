---
title: A consumer smoke library list that grows past the 18 pinned libraries fails the smoke control
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:50:08.543Z'
id: SCEN-CASE-prolog-build-pipeline-validation-NINETEEN-LIBRARIES
type: scenario
---
Given the pinned SWI-Prolog 10.0.2 archive layout with its 18 required libraries, when the consumer smoke's required library list holds a 19th entry, then the smoke control fails before the smoke runs because the list no longer equals the 18 pinned library paths.

This covers the value past the bound, `gt 18` on `consumer_smoke_required_libraries_checked`. scripts/tests/swipl-build-pipeline.test.ts "uses isolated absolute smoke execution and preserves success" exercises it: its control asserts the required library list equals the 18 pinned entries and that each one is loaded and reported.
