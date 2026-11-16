---
title: The action pushes a merge that fails the check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:49.192Z'
id: SCEN-NEG-kb-merge-action-verify-before-push-VIOLATED
type: scenario
---
The merged tree fails the configured check, or kibi sync rewrites .kb/symbols.yaml after the merge, and the action pushes the merge anyway, so the pull request now carries a broken KB.

This is the failure side the action must not produce; scripts/tests/kb-merge-action.test.ts checks it.