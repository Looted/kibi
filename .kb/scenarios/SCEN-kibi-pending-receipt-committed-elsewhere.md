---
title: A file committed on another branch without a sync leaves this branch syncing
status: active
expects: success
tags:
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: SCEN-kibi-pending-receipt-committed-elsewhere
type: scenario
---
Given an entity upserted on develop, whose file is committed on a new branch with no sync there, when develop is checked out again and kibi sync runs, then sync succeeds and retires the receipt, because that branch's Git owns the file.

documentation/tests/e2e/packed/pending-receipt-committed-elsewhere.test.ts exercises it through the installed CLI.