---
id: TEST-kibi-verification-receipts-v2
title: Current-contract v2 receipt ingestion tests
status: passing
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: packages/cli/tests/operations/ingest-verification.test.ts
tags: [requirements, proof, verification, receipts, v2, cli]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-verification-receipts-v2
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Validates v2 command and contract binding, unique required case results, retry and duration validation, append-only history, timeout/interruption failure evidence, and rejection of current-contract mismatches as proof.
