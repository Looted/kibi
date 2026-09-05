---
id: TEST-kibi-telemetry-acceptance-gate
title: Packed telemetry acceptance gate tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-telemetry-acceptance-gate.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - telemetry
  - acceptance
  - diagnostics
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-telemetry-acceptance-gate
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-telemetry-acceptance
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a08df670991ad208c2facd58
    test_id: TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: failed
    code_snapshot: 3f8b48dd84116905859ff9ad9beb6f42472888fcc02de24d6ff6ef46c41cba7f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-01T02:00:18.844Z'
    finished_at: '2026-09-01T02:24:25.062Z'
    artifact_digest: e0a3f7afc30f978f4299d03e9c4487f5048bf904f91509c6d0747dcbb0c5d1ea
    contract_hash: 53e33025f141bd0e0f8b8c3c6a0f674778223f7d7788304ab9477fec27d35269
    fingerprint: 2dc33f103dcc37810f2babb58eaf925c2b776bf2e68a4204673315852a5637e3
    fingerprint_components:
      contract: 53e33025f141bd0e0f8b8c3c6a0f674778223f7d7788304ab9477fec27d35269
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
      - symbol_id: SYM-test-packed-telemetry-acceptance
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-telemetry-acceptance
        target: default
        reason: 'run did not pass (outcome: failed)'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1cad0820cc7ac1662bb2ff2f
    test_id: TEST-kibi-telemetry-acceptance-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 72ab30da409f3a1d146a85cc81a6aaa3124fac328f92edc5b6fe99ed887d4ee1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-01T04:29:39.954Z'
    finished_at: '2026-09-01T05:13:15.667Z'
    artifact_digest: 2a51d21e49186d14cacba8be3e4e03420e04acc7c3d53eb30168e286dce30b75
    contract_hash: 53e33025f141bd0e0f8b8c3c6a0f674778223f7d7788304ab9477fec27d35269
    fingerprint: 2dc33f103dcc37810f2babb58eaf925c2b776bf2e68a4204673315852a5637e3
    fingerprint_components:
      contract: 53e33025f141bd0e0f8b8c3c6a0f674778223f7d7788304ab9477fec27d35269
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
      - symbol_id: SYM-test-packed-telemetry-acceptance
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Exercises `kibi.telemetry-acceptance.v1` through a fresh packed CLI installation, including successful enforcement, fail-closed exit behavior, canonical preflight correlation, repeated failure detection, and unfiltered quality-diagnostic presentation.
