---
title: A feature branch push re-merges every pull request
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:52.298Z'
id: SCEN-NEG-ci-kb-merge-branch-push-VIOLATED
type: scenario
---
Every push to any branch makes the workflow test and merge all open pull requests, so pushes race each other on unrelated branches; or a pushed branch is not checked at all until develop moves.

This is the failure side the action must not produce; scripts/tests/kb-merge-resolution.test.ts checks it.