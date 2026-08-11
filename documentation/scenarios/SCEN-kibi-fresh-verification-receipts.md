---
id: SCEN-kibi-fresh-verification-receipts
title: Evaluate snapshot-bound E2E receipt evidence conservatively
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-fresh-verification-receipts.md
tags: [requirements, proof, verification, receipts, e2e, parity]
links:
  - type: verified_by
    target: TEST-kibi-fresh-verification-receipts
---

Given a scenario-backed end-to-end test with only durable passing metadata, a receipt for another code snapshot, a stale result, a current failure, malformed provenance, or a future timestamp, when coverage evaluates the requirement, then the passing-E2E proof stage remains missing or unresolved and reports the matching ranked receipt gap.

Given append-only receipt history whose newest result for the current deterministic workspace snapshot is a fresh pass, when CLI and MCP coverage evaluate the requirement, then both surfaces expose the same snapshot identity and accept the receipt as inspectable E2E evidence independently of the durable test status.
