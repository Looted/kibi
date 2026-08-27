---
id: TEST-kibi-proof-aware-quality-diagnostics
title: Proof-aware coverage-depth and receipt-gap diagnostic tests
status: passing
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: packages/cli/tests/public/impact/coverage-depth-quality.test.ts
tags: [requirements, diagnostics, coverage, proof, receipts, cli]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-proof-aware-quality-diagnostics
---

Validates suppression of stale weak-depth heuristics when current scenario-backed E2E proof passes, preservation of independent proof gaps, and bounded receipt-gap evidence with v2 remediation guidance.
