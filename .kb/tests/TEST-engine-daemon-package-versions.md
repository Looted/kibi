---
title: Engine daemon package version tests
status: active
priority: must
tags:
  - engine
  - daemon
  - prolog
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-engine-daemon-package-versions
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:50.427Z'
id: TEST-engine-daemon-package-versions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5ffb663e73026572f3dc037a
    test_id: TEST-engine-daemon-package-versions
    scope: end_to_end
    outcome: passed
    code_snapshot: 3464ae42f083c2b6e9ed9b482fa7e54f58e94f0d5628e4ace6c2f8d99ecacd37
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T21:31:22.741Z'
    finished_at: '2026-10-08T21:31:31.027Z'
    artifact_digest: 9edd6dfb3779e6e7036f2825ca9f9f128d8d96d58a46085265cf8f1dbdd162c3
    contract_hash: 8939d97d7b3458a225bded668ac4ae4ff554722593a2ac0b80289892c48d4e55
    binding_hash: 1783af181a8e4d274b30d126709f5f6da211de1b894d2f3c915bd311922d8f08
    fingerprint: 5c11d16c14640a3971703ae10611c1b886858a56762bcc81a840e3fc7baf3b03
    fingerprint_components:
      contract: 8939d97d7b3458a225bded668ac4ae4ff554722593a2ac0b80289892c48d4e55
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
      - symbol_id: SYM-test-engine-daemon-package-versions
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the engine daemon identity suite against a real daemon: a request with other package versions is refused for every method but handshake and stop, the handshake reports the daemon's versions, and a daemon started with other versions is replaced by a client with the built versions.