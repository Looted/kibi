---
id: SCEN-kibi-verification-evidence-contract
title: Record an end-to-end test as proof for a scenario
status: active
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/scenarios/SCEN-kibi-verification-evidence-contract.md
tags: [verification, e2e, playwright, receipts, proof]
links:
  - type: verified_by
    target: TEST-kibi-verification-evidence-contract
---

When a project runs one selected Playwright case through the Kibi wrapper, the reporter records the exact case ID, argv, contract hash, snapshot, and outcome. Kibi ingests the receipt only when all required fields and freshness checks pass and exposes the result for requirement proof queries.
