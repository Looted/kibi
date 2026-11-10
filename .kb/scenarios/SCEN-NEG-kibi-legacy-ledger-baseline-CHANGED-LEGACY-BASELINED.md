---
title: Sync refuses a legacy requirement whose prose changed after the baseline
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T09:30:00.000Z'
id: SCEN-NEG-kibi-legacy-ledger-baseline-CHANGED-LEGACY-BASELINED
type: scenario
---
Given a project whose first sync baselined two legacy requirements without proposition ledgers, when one of them is reworded into a new normative statement and synced again, then sync fails with proposition-complete ingestion naming that file, and the untouched legacy requirement is not named.

This is the failure side of the one-time legacy baseline: the baseline covers prose as it was, never later edits. documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts "refuses a legacy requirement whose prose changed after the baseline" exercises it, inside the TEST-kibi-proposition-complete-ingestion proof run.
