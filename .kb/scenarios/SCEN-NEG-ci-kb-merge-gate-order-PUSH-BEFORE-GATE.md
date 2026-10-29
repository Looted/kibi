---
title: A merge that fails the proof gate is not pushed, and a push step ordered before the gate is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:10:56.032Z'
id: SCEN-NEG-ci-kb-merge-gate-order-PUSH-BEFORE-GATE
type: scenario
---
Given the resolve job of the KB merge workflow and a proof gate step that fails, when the job's steps run with the stop-at-first-failure rule GitHub Actions applies, then the push step never runs; and given the same job with the push step moved ahead of the gate, the failing gate no longer stops the push and the step order check rejects the workflow.

This is the failure side of the gate order: a merge that fails the proof gate must never reach the PR branch. scripts/tests/kb-merge-resolution.test.ts "a merge that fails the proof gate is never pushed, and a push ordered before the gate is refused" exercises it.
