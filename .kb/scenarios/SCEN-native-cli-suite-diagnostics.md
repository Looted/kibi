---
title: Native Linux CLI sampler preserves outcomes while recording bounded private process metadata
status: active
tags:
  - prolog
  - spike
  - linux
  - diagnostics
text_ref: scripts/tests/swipl-spike-diagnostics.test.ts
id: SCEN-native-cli-suite-diagnostics
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Given a native Linux CLI command that prints stdout and stderr and launches a child from a background thread, when monitoring observes either exit 0 or exit 7, then the command result and output remain visible, descendants are sampled within the process/task bounds, and arguments/environment are absent from samples. Given an unwritable diagnostic destination, when a successful command runs, then its result and output remain successful and an unavailable-diagnostics message is emitted.
