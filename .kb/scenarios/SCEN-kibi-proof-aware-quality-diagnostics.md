---
id: SCEN-kibi-proof-aware-quality-diagnostics
title: Keep proof-aware diagnostics consistent across coverage and full checks
status: active
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: documentation/scenarios/SCEN-kibi-proof-aware-quality-diagnostics.md
tags: [requirements, diagnostics, coverage, proof, receipts]
links:
  - type: verified_by
    target: TEST-kibi-proof-aware-quality-diagnostics
---

Given a requirement with a scenario-backed E2E test whose current proof receipt passes for the live snapshot, when full checks and complete coverage run, then both surfaces use the same proof evidence and full checks do not emit a contradictory `coverage_depth_review`. Independent ontology, symbol, coordinate, or receipt gaps remain visible.

Given receipt freshness gaps, when diagnostics are emitted, then each bounded record identifies the affected requirement and test IDs and directs the agent to the exact current contract through `kibi prove` rather than to hand-author or rewrite historical receipts.
