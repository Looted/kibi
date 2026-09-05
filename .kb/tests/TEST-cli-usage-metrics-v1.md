---
id: TEST-cli-usage-metrics-v1
title: CLI usage metrics command tests
status: active
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/commands/usage-metrics.test.ts
tags:
  - cli
  - usage-metrics
  - unit
links:
  - type: validates
    target: SCEN-cli-usage-metrics-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-usage-metrics-v1
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies the usage metrics command reads diagnostic event data and reports expected summaries.
