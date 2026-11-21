---
title: Packed compile-intent plan hash binding and apply rejection
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-plan-compiler-hash
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c8d28e9177b4de9737bcb447
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: 57ab5d2c880b64421efddb7fac0b5437df987937bcff13454f71ddfde569da0d
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
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

Packed end-to-end regression for packed compile-intent plan hash binding and apply rejection.
