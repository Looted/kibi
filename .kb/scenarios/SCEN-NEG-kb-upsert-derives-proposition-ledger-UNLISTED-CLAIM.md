---
title: A kb_upsert that derives a ledger lists every claim it recorded
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-15T20:20:30.456Z'
id: SCEN-NEG-kb-upsert-derives-proposition-ledger-UNLISTED-CLAIM
type: scenario
---
Given a requirement write that sends no ledger contract, when kb_upsert derives the ledger, then inventoryApplied in the result lists every claim it recorded with its key, role, status and text, so the writer sees what it is now on record as asserting; a derived claim missing from that list would be on record without the writer knowing.

packages/cli/tests/operations/mutation.test.ts exercises it.