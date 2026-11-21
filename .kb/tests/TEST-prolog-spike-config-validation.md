---
title: SWI-Prolog spike configuration accepts pins and rejects invalid inputs
status: passing
tags:
  - prolog
  - spike
  - build
  - validation
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-spike-config-validation
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-spike-config-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-97567b73d377fc0f358b7058
    test_id: TEST-prolog-spike-config-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 84e9dae49daa35e44fce96b8d4ebe6ed1da1430fd21244d4f268186f4895f6bb
    binding_hash: 90d2dc5aeace2c9d027688538bf823c6de26a4a7865259d042abd8e99d568ac6
    fingerprint: 7342914246bc550addf138e13746707387ea8f0287ce5bd13df5856b11499a5d
    fingerprint_components:
      contract: 84e9dae49daa35e44fce96b8d4ebe6ed1da1430fd21244d4f268186f4895f6bb
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
      - symbol_id: SYM-test-prolog-spike-config-validation
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
Run `bun test ./scripts/tests/swipl-spike-config.test.ts`. The test invokes the public spike wrapper with the pinned manifest for Linux x64 and macOS arm64, checks the reported versions and required libraries, and confirms no native build directory appears. It also rejects malformed manifests and an unsupported target with specific errors.