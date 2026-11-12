---
title: A scoped kb_check lists each impact diagnostic once
status: active
tags: []
origin:
  kind: agent
  recorded_at: '2026-11-12T13:47:31.209Z'
id: SCEN-kb-check-impact-diagnostics-once
type: scenario
---
Given a `kb_check` with `sourceFiles` naming a file whose changed symbols produce impact diagnostics, when the result is returned, then each of those diagnostics is under `impactDiagnostics` and not under `qualityDiagnostics`, its migration plan action names it by id and entity, and the text lists it once, with a suggestion that several diagnostics share written once above their messages.

The result stays complete: no diagnostic is dropped, only its copies. packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts and packages/cli/tests/public/operations/migration-plan-coverage.test.ts assert it.
