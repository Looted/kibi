---
title: Proof runner exact accounting, first-attempt outcomes and owned process cleanup
status: passing
verification_scope: integration
verification_perspective: internal
tags:
  - test-quality
  - regression
  - internal
id: TEST-proof-runner-integrity
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Runs scripts/tests/run-proof-producer.test.mjs and scripts/tests/run-packed-e2e.test.mjs. Exercises real child failures, requested-ID completeness, workspace selection, descendant timeout cleanup and zero/all-skipped report rejection. Internal runner integration evidence; not a consumer end-to-end product claim.