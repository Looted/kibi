---
id: TEST-cli-branch-store-recovery
title: CLI exact branch-store recovery contract
status: active
tags:
  - cli
  - branching
  - recovery
source: packages/cli/tests/commands/branch.test.ts
links:
  - type: validates
    target: SCEN-branch-store-recovery
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-exact-branch-recovery
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1045c35d2d03c09e3a7ae94e
    test_id: TEST-cli-branch-store-recovery
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: cda95051897bf6845a0c48154d5b50b8151327f2af0cd08087fcae5b9d1ecefd
    binding_hash: f49ac14142a93e9226f839f906c3d4df204757cfd9677a09cd7f9047925434d1
    fingerprint: ee53ad48db3b932dc6de445243f0ba6daf8eccce144f17b391b96067211ce0df
    fingerprint_components:
      contract: cda95051897bf6845a0c48154d5b50b8151327f2af0cd08087fcae5b9d1ecefd
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
      - symbol_id: SYM-test-packed-exact-branch-recovery
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The CLI branch and packed consumer tests prove that same-identity literal-to-hashed migration remains available, every cross-identity pair (including main to master) is refused, and explicitly applied recovery preserves a backup and returns a fresh exact branch store.
