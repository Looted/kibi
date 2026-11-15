---
title: A receipt from another branch does not fail this branch's sync
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: SCEN-NEG-kibi-pending-receipt-OTHER-BRANCH-FAILS-SYNC
type: scenario
---
Given a pending-source receipt written on another branch for a file this branch does not have, when kibi sync runs, then it does not fail with a missing pending source and does not ask for kibi branch recover.

documentation/tests/e2e/packed/pending-receipt-branch-scope.test.ts exercises it through the installed CLI.