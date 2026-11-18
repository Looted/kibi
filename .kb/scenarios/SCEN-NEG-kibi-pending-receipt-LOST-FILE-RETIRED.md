---
title: A receipt for a file no branch holds still fails the sync
status: active
expects: rejection
tags:
  - negative-path
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: SCEN-NEG-kibi-pending-receipt-LOST-FILE-RETIRED
type: scenario
---
Given a pending-source receipt whose file was committed only on a branch that has since been deleted, when kibi sync runs, then the receipt is not retired and sync fails with "Pending source is missing" for that file. The same holds when another local branch has committed a different file at that path: only a committed blob whose bytes hash to the receipt's recorded hash counts as the receipt's file.

documentation/tests/e2e/packed/pending-receipt-committed-elsewhere.test.ts exercises it through the installed CLI.