---
title: An unwritable diagnostic destination is reported without failing the monitored command
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:25.458Z'
id: SCEN-NEG-native-cli-suite-diagnostics-UNWRITABLE-OUTPUT
type: scenario
---
Given a native Linux CLI command that succeeds and a diagnostic destination whose parent is a regular file, when the command runs under the diagnostics monitor, then the diagnostics failure is contained: the command still exits 0 with its stdout and stderr intact, stderr reports that CLI diagnostics are unavailable, and no sample file is written.

This is the failure side of native CLI diagnostics: a broken diagnostic sink must not turn a passing test command into a failure. scripts/tests/swipl-spike-diagnostics.test.ts "unavailable diagnostic output preserves a successful command" exercises it.
