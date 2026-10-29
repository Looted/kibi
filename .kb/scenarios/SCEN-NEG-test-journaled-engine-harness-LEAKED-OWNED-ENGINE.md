---
title: The owned engine test runner terminates a process a test left running and removes its private runtime
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:12.274Z'
id: SCEN-NEG-test-journaled-engine-harness-LEAKED-OWNED-ENGINE
type: scenario
---
Given a test command run through the owned engine runner that spawns a detached long-lived process and records its PID in the private runtime directory, when the command exits, then the runner kills that exact process and deletes the private runtime directory.

This is the failure side of owned teardown: an engine a test forgot to stop must not outlive its harness or keep fixture state alive. scripts/tests/run-owned-engine-tests.test.ts "provides a private runtime and cleans an exact owned PID" exercises it.
