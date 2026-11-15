---
title: A branch without a file another branch committed still syncs
status: active
expects: success
tags:
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: SCEN-kibi-pending-receipt-branch-scope
type: scenario
---
Given an entity upserted on a feature branch, whose pending-source receipt records that branch, when the file is committed there and another branch without it is checked out, then kibi sync on that branch succeeds and leaves the receipt in place, and back on the feature branch sync consumes the receipt because Git tracks the file.

documentation/tests/e2e/packed/pending-receipt-branch-scope.test.ts exercises it through the installed CLI.