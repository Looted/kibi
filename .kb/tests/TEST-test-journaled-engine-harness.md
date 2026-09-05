---
id: TEST-test-journaled-engine-harness
title: Journaled engine test reuse, isolation, and cleanup suite
status: passing
created_at: 2026-08-12T00:00:00.000Z
updated_at: 2026-08-12T00:00:00.000Z
source: packages/cli/tests/engine.test.ts
priority: must
tags:
  - testing
  - engine
  - cli
  - e2e
links:
  - type: validates
    target: SCEN-test-journaled-engine-harness
  - type: validates
    target: REQ-test-journaled-engine-harness
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-owned-engine-runner
      target: default
    - symbol_id: SYM-packed-e2e-runner
      target: default
    - symbol_id: SYM-proof-runner
      target: default
    - symbol_id: SYM-shared-npm-cache-resolution
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c38a6b4387faf6ce0d69ef65
    test_id: TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: failed
    code_snapshot: 3f8b48dd84116905859ff9ad9beb6f42472888fcc02de24d6ff6ef46c41cba7f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-01T02:00:18.844Z'
    finished_at: '2026-09-01T02:24:25.062Z'
    artifact_digest: e0a3f7afc30f978f4299d03e9c4487f5048bf904f91509c6d0747dcbb0c5d1ea
    contract_hash: 2e3fa96eb6075ef2c7427ffe3fdd61e1fb812f4dc9f3ee2785c55c3f81048b69
    fingerprint: 4572356cb6d7e263d703c940d3ea9f36e412de666dab1f2a38bdb433eeab683a
    fingerprint_components:
      contract: 2e3fa96eb6075ef2c7427ffe3fdd61e1fb812f4dc9f3ee2785c55c3f81048b69
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-test-owned-engine-runner
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-packed-e2e-runner
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-proof-runner
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-shared-npm-cache-resolution
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-owned-engine-runner
        target: default
        reason: 'run did not pass (outcome: failed)'
      - symbol_id: SYM-packed-e2e-runner
        target: default
        reason: 'run did not pass (outcome: failed)'
      - symbol_id: SYM-proof-runner
        target: default
        reason: 'run did not pass (outcome: failed)'
      - symbol_id: SYM-shared-npm-cache-resolution
        target: default
        reason: 'run did not pass (outcome: failed)'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1517828f99c98a2fadb2405c
    test_id: TEST-test-journaled-engine-harness
    scope: end_to_end
    outcome: passed
    code_snapshot: 72ab30da409f3a1d146a85cc81a6aaa3124fac328f92edc5b6fe99ed887d4ee1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-01T04:29:39.954Z'
    finished_at: '2026-09-01T05:13:15.667Z'
    artifact_digest: 2a51d21e49186d14cacba8be3e4e03420e04acc7c3d53eb30168e286dce30b75
    contract_hash: 2e3fa96eb6075ef2c7427ffe3fdd61e1fb812f4dc9f3ee2785c55c3f81048b69
    fingerprint: 4572356cb6d7e263d703c940d3ea9f36e412de666dab1f2a38bdb433eeab683a
    fingerprint_components:
      contract: 2e3fa96eb6075ef2c7427ffe3fdd61e1fb812f4dc9f3ee2785c55c3f81048b69
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-owned-engine-runner
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-packed-e2e-runner
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-proof-runner
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-shared-npm-cache-resolution
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

The harness tests verify graceful signal-driven journal flush and replay,
shared interactive Prolog fixtures for ordinary behavior, exact CLI metadata
and lazy-loader parity, bounded root-suite concurrency and deterministic
summaries, shared packed installation setup, private engine runtime ownership,
and teardown before fixture deletion.

The full curated unit and packed E2E suites provide the integration evidence:
they must complete without leaked test-owned engines, isolation failures, or
contract drift across CLI and MCP surfaces.
