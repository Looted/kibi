---
title: Native report parsing rejects malformed and ambiguous execution evidence
status: passing
verification_scope: integration
verification_perspective: internal
tags:
  - test-quality
  - regression
  - internal
id: TEST-native-report-integrity
type: test
---
Runs packages/cli/tests/proof/native-adapter-evaluation.test.ts and tap-adapter.test.ts. Verifies XML decoding, self-closing failures, nested TAP identities, conflicting results and strict contract evaluation. Native reports without complete attempt history remain insufficient for first-attempt proof.