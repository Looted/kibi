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
    receipt_id: PR-bd5fd2e858f75d17d2b72a4c
    test_id: TEST-engine-daemon-package-versions
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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