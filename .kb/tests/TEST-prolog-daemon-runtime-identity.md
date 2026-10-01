---
title: Daemon handshake and replacement controls
status: active
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-daemon-runtime-identity
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-daemon-runtime-identity
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-45274f34f1f50fb4ec481cb2
    test_id: TEST-prolog-daemon-runtime-identity
    scope: end_to_end
    outcome: passed
    code_snapshot: 3d9aa1cd05cf3fa7405d9315cc4fe96ec4da7d660a7aefdd65ff9aabae90dc04
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:01:53.857Z'
    finished_at: '2026-09-30T23:01:56.410Z'
    artifact_digest: 6fbe44dac346137b306b88d97ccb89e271e72491e31d7bbbca29e66733395a08
    contract_hash: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
    binding_hash: d9c21f8e16c983abf6e13a8f409ad09a95233181f650d5ff1d51fce9d0a5325a
    fingerprint: f7dee56c5f569ced9f4100db75e1bc6585a89a9e8063804985d8fcb39a5639ba
    fingerprint_components:
      contract: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
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
      - symbol_id: SYM-test-prolog-daemon-runtime-identity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-124964cd3d71bcf724eb7aad
    test_id: TEST-prolog-daemon-runtime-identity
    scope: end_to_end
    outcome: passed
    code_snapshot: 63f6d3dc8bbf32b8928f227d9c655d144d80ee4962205e7f9f5066dd9ea8def0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:26:40.273Z'
    finished_at: '2026-09-30T23:26:42.303Z'
    artifact_digest: d61f74374f2506068af24b1868a4e6219a4434dfe73fb2c71f9ee6cacfa5aa13
    contract_hash: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
    binding_hash: d9c21f8e16c983abf6e13a8f409ad09a95233181f650d5ff1d51fce9d0a5325a
    fingerprint: f7dee56c5f569ced9f4100db75e1bc6585a89a9e8063804985d8fcb39a5639ba
    fingerprint_components:
      contract: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
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
      - symbol_id: SYM-test-prolog-daemon-runtime-identity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0a2a064b7678de662855b93a
    test_id: TEST-prolog-daemon-runtime-identity
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e9167427ae939a3e23103a1ce519ea31cd0b777f3f9007ca75f34a2fe7a1f44
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:29:09.300Z'
    finished_at: '2026-09-30T23:29:11.381Z'
    artifact_digest: 636fdc8b51c9e483d3d436599ef544c00abb329180833056d162d63ebdde5e8f
    contract_hash: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
    binding_hash: b7fee4863ed5eb90a2714fb99892abe29baf6d204161c73e0a37a1184fb3cadd
    fingerprint: f7dee56c5f569ced9f4100db75e1bc6585a89a9e8063804985d8fcb39a5639ba
    fingerprint_components:
      contract: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
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
      - symbol_id: SYM-test-prolog-daemon-runtime-identity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d343fd2366c1206237e47a9c
    test_id: TEST-prolog-daemon-runtime-identity
    scope: end_to_end
    outcome: passed
    code_snapshot: 4127a472ae2d2fb421ba7ac3873641c7dcf5429b0de51f24ab286b5ae40225ea
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T23:47:32.962Z'
    finished_at: '2026-09-30T23:47:35.095Z'
    artifact_digest: 17492d884827833c4479e5e826da1b8c9e69c9c55dc61345871d32072674be52
    contract_hash: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
    binding_hash: b7fee4863ed5eb90a2714fb99892abe29baf6d204161c73e0a37a1184fb3cadd
    fingerprint: f7dee56c5f569ced9f4100db75e1bc6585a89a9e8063804985d8fcb39a5639ba
    fingerprint_components:
      contract: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
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
      - symbol_id: SYM-test-prolog-daemon-runtime-identity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
