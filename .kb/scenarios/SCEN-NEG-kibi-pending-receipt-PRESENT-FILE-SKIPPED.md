---
title: A present untracked file is still compiled on another branch
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: SCEN-NEG-kibi-pending-receipt-PRESENT-FILE-SKIPPED
type: scenario
---
Given an untracked entity file whose receipt was written on another branch, or a receipt that names no branch, when kibi sync runs, then the receipt is still checked: the present file is compiled, and a missing file bound by a receipt with no branch still fails the sync.

documentation/tests/e2e/packed/pending-receipt-branch-scope.test.ts exercises it through the installed CLI.