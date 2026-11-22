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
    receipt_id: PR-4fe0bfa709d69011d55a623d
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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
