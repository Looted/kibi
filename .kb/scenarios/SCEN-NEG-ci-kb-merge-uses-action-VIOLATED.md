---
title: Kibi merges with its own private script
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:53.058Z'
id: SCEN-NEG-ci-kb-merge-uses-action-VIOLATED
type: scenario
---
The workflow merges and pushes with its own shell steps, so the action consumers copy is never run in Kibi's repository and breaks unnoticed.

This is the failure side the action must not produce; scripts/tests/kb-merge-resolution.test.ts checks it.