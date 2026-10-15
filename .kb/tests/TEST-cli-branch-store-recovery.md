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
    receipt_id: PR-79a24affd6b3b696716e9f0c
    test_id: TEST-cli-branch-store-recovery
    scope: end_to_end
    outcome: passed
    code_snapshot: cb39f0e560f5857d1d62061507d78f2d645b1f132184f32b37c3312b2e3871a4
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-14T21:41:55.208Z'
    finished_at: '2026-10-14T21:43:49.988Z'
    artifact_digest: 5f909d65d664dad33745ca111a9f4934cca74d176d0b25c93a14b0894ebf0076
    contract_hash: cda95051897bf6845a0c48154d5b50b8151327f2af0cd08087fcae5b9d1ecefd
    binding_hash: 18ca1b7296ed40f9c430940c2f7e564a731a12ff46b386736c0d1270f0513a9c
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
