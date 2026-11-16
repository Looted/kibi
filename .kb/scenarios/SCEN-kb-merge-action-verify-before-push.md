---
title: A merge is pushed only after sync and the check pass
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:43.697Z'
id: SCEN-kb-merge-action-verify-before-push
type: scenario
---
The action merges, runs kibi sync and then the check on the merged tree; when the check exits non-zero or sync rewrites a tracked file the branch keeps its old tip and the run fails, and with a passing check the same merge is pushed.