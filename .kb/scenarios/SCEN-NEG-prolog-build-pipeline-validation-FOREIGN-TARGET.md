---
title: A SWI-Prolog build target outside the four launch targets is refused before any work directory is kept
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
Given a pinned SWI-Prolog build manifest, when the pipeline configuration is verified for the target win32-x64, then the command exits 1 with no output, stderr names the unsupported target, and the temporary work directory is removed.

This is the failure side of the launch target set: the build pipeline must not quietly produce or accept an archive for a platform Kibi does not ship. scripts/tests/swipl-spike-config.test.ts "rejects a target outside the spike target set" exercises it.
