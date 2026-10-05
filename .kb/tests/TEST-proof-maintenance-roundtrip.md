---
title: Proof maintenance preserves source and graph state through reload and interruption
status: passing
verification_scope: integration
verification_perspective: internal
tags:
  - test-quality
  - regression
  - internal
id: TEST-proof-maintenance-roundtrip
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Runs packages/cli/tests/commands/proof-maintenance-in-process.test.ts against private real Prolog stores and authored test documents. Verifies migration, receipt pruning, reload, preserved bodies and interrupted multi-document migration. Command-wrapper and orchestration unit tests are ancillary.