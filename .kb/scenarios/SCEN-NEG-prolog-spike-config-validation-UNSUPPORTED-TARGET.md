---
title: The spike configuration check rejects a target outside the spike target set
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:43.710Z'
id: SCEN-NEG-prolog-spike-config-validation-UNSUPPORTED-TARGET
type: scenario
---
Given the pinned spike manifest, when verification is asked for the win32-x64 target, then it exits 1 with an unsupported target error, prints nothing on stdout and leaves no work directory behind.

This is the failure side of spike target validation: a platform outside the spike target set must not reach a native build. scripts/tests/swipl-spike-config.test.ts "rejects a target outside the spike target set" exercises it.
