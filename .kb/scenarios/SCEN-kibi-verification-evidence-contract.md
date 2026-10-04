---
id: SCEN-kibi-verification-evidence-contract
title: Record an end-to-end test as proof for a scenario
status: active
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: .kb/scenarios/SCEN-kibi-verification-evidence-contract.md
tags: [verification, e2e, playwright, receipts, proof]
links:
  - type: verified_by
    target: TEST-kibi-verification-evidence-contract
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

When a project runs one selected Playwright case through the Kibi wrapper, the reporter records the exact case ID, argv, contract hash, snapshot, and outcome. If the contract changed, Kibi preserves all earlier receipts, appends the current-contract result, and exposes only current-contract, current-snapshot evidence as proof.
