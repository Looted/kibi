---
title: A coverage run whose later selected test file fails exits with a test failure
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:52:53.498Z'
id: SCEN-NEG-prolog-coverage-test-selection-SWALLOWED-FAILURE
type: scenario
---
Given two Prolog test files selected with repeated --test options, the second of which contains a failing test, when the coverage runner runs them, then it exits with the test-failure status, records tests.passed as false and names the failing test.

This is the failure side of failure propagation: a failing suite later in the selection must not be hidden behind an earlier passing one. packages/core/tests/prolog-coverage-runner.test.ts "runs every supplied test file, including a later failing suite" exercises it.
