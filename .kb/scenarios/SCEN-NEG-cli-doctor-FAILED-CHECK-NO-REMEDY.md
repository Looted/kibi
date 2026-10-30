---
title: kibi doctor in a workspace without .kb/ fails and gives a remediation step for each failed check
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:24.580Z'
id: SCEN-NEG-cli-doctor-FAILED-CHECK-NO-REMEDY
type: scenario
---
Given a git repository where kibi init has not run, when kibi doctor runs, then it exits non-zero, marks the missing .kb/ directory and manifest as failed, and follows each failed check with the step that fixes it, Run: kibi init.

This is the failure side of doctor diagnostics: a failed check reported without a way forward would leave the operator guessing. documentation/tests/e2e/packed/cli-workflows.test.ts "should fail kibi doctor before init with a remediation step for each failed check" exercises it.
