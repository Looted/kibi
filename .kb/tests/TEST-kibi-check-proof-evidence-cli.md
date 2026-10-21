---
id: TEST-kibi-check-proof-evidence-cli
title: Consumer CLI check drops coverage_depth_review once kibi prove records a passing e2e receipt
status: passing
priority: must
created_at: 2026-10-21T12:59:56.000Z
updated_at: 2026-10-21T12:59:56.000Z
tags:
  - proof
  - receipts
  - diagnostics
  - coverage
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-kibi-proof-aware-quality-diagnostics
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-check-proof-evidence-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-check-proof-evidence-cli
    target: default
    native_id: packages/cli/tests/consumer/check-proof-evidence.test.ts::kibi check proof evidence through the kibi CLI::a current passing e2e receipt clears coverage_depth_review in kibi check
    source_file: packages/cli/tests/consumer/check-proof-evidence.test.ts
    line: 132
origin:
  kind: agent
  recorded_at: '2026-10-21T12:59:56.000Z'
type: test
---

Drives `kibi check`, `kibi prove` and `kibi coverage` through the built `kibi` binary against a fixture requirement whose only scenario test is still `status: active` (`packages/cli/tests/consumer/check-proof-evidence.test.ts`).

- Before any receipt, `kibi check` lists `coverage_depth_review` for the requirement and its evidence carries the proof status `kibi coverage` reports.
- After `kibi prove` records a current passing end-to-end receipt, coverage reports the passing-e2e stage as passed and `kibi check` no longer lists `coverage_depth_review` for the requirement.
