---
id: SCEN-kibi-verification-receipts-v2
title: Append current-contract v2 evidence without rewriting receipt history
status: active
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: documentation/scenarios/SCEN-kibi-verification-receipts-v2.md
tags: [requirements, proof, verification, receipts, e2e, v2]
links:
  - type: verified_by
    target: TEST-kibi-verification-receipts-v2
---

Given a scenario-backed E2E test with an existing receipt history, when the exact current verification contract is executed through `kibi verify`, then Kibi appends a `kibi.verification-receipt.v2` result containing the command, contract hash, required case results, timing, snapshot, outcome, and artifact digest while preserving every older receipt unchanged.

Only the fresh passing v2 result that matches both the live code snapshot and current contract proves the test. Older v1 entries remain readable historical compatibility evidence and do not get rewritten or promoted to proof.
