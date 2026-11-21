---
title: Engine daemon package version tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ce35cc8890eb794a17ed038e
    test_id: TEST-engine-daemon-package-versions
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 8939d97d7b3458a225bded668ac4ae4ff554722593a2ac0b80289892c48d4e55
    binding_hash: 2591daa5ecf1d49dd08037a35590fbe72a43b613d3aacd3cb9378cead4fd13be
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
    kind: e2e
    evidence_level: tested
---
Runs the engine daemon identity suite against a real daemon: a request with other package versions is refused for every method but handshake and stop, the handshake reports the daemon's versions, and a daemon started with other versions is replaced by a client with the built versions.