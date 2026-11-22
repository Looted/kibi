---
id: TEST-004
title: kibi check detects must-priority coverage violations
status: passing
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - cli
  - check
  - validation
links:
  - type: validates
    target: REQ-cli-check
  - type: validates
    target: SCEN-005
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-check
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4daf6ea2679f0f2aa799e00b
    test_id: TEST-004
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
    binding_hash: d9dfe458d8d704561a877a6919d20a15c69925006d31afa17256484c9334d4c3
    fingerprint: 94f97b839d4a2976058c8c11d4fa4c3d46aa8c0bd29b39b461a0912b69609130
    fingerprint_components:
      contract: 57d645db95afaa58986cdf75186d35d4b0dc88398cfb627d2a541ba64040f81c
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
      - symbol_id: SYM-e2e-packed-cli-check
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Seeds KB with a `must`-priority requirement that has no linked scenario or test.
Runs `kibi check --rules must-priority-coverage`. Asserts:
- Exit code is non-zero
- Output contains the uncovered requirement's ID
- A requirement with full scenario + test coverage passes the same rule
