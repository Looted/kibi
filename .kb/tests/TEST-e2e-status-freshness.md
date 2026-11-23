---
title: Canonical knowledge lanes drive packed status freshness
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-status-freshness
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d8dfe7244015608c04a281e1
    test_id: TEST-e2e-status-freshness
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
    binding_hash: 0100e8328e8738f6069aefe6fbb6e81562ec766743a6a5b8bf988454a158de78
    fingerprint: ffca472a14a25839dab1702516c25ad5b8fd551b4e752bd45da14362072290f3
    fingerprint_components:
      contract: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
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
      - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
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

Packed end-to-end regression for canonical knowledge lanes drive packed status freshness.
