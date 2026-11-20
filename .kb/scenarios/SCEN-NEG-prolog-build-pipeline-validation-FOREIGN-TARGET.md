---
title: A SWI-Prolog build target outside the five launch targets is refused before any work directory is kept
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:43.821Z'
id: SCEN-NEG-prolog-build-pipeline-validation-FOREIGN-TARGET
type: scenario
---
Given a build target that is not one of the five accepted launch targets, when the pipeline configuration is validated, then the target is refused before any work directory is kept. scripts/tests/swipl-build-pipeline.test.ts and scripts/tests/swipl-windows-repack.test.ts cover the refusal.