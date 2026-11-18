---
title: A file committed on another branch does not fail this branch's sync
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: SCEN-NEG-kibi-pending-receipt-COMMITTED-ELSEWHERE-FAILS
type: scenario
---
Given a pending-source receipt whose file is absent here but committed on another local branch, when kibi sync runs, then it does not fail with a missing pending source and does not ask for kibi branch recover.

documentation/tests/e2e/packed/pending-receipt-committed-elsewhere.test.ts exercises it through the installed CLI.