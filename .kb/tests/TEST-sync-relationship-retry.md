---
title: kibi sync asserts a front-matter relationship once its missing target is added
status: passing
tags:
  - cli
  - sync
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-sync-relationship-retry
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the fixes from the requirements-to-code audit, including retrying relationships sync could not assert: "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:17:44.092Z'
id: TEST-sync-relationship-retry
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bbea8423b796f6ae57682a22
    test_id: TEST-sync-relationship-retry
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 49fd050f6fb77a538822e1889967826872dcc4b00ef70d7ad6b7111296047d2d
    binding_hash: fe66765d91a68d4953c7b2eae6c49b16f18bee293822e1e03b7b74b19300c6bd
    fingerprint: e9bf5dc770f8cd59ebe2fb20bcd97a462380f7e094a1326386b4199ac05b26cd
    fingerprint_components:
      contract: 49fd050f6fb77a538822e1889967826872dcc4b00ef70d7ad6b7111296047d2d
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
      - symbol_id: SYM-test-sync-relationship-retry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the built kibi CLI in a fresh Git repository: a scenario links to a scenario that does not exist, sync reports the failed relationship, the target is added alone, and the next sync asserts the link (kibi query shows it) while a further sync imports nothing. It would pass falsely only if the first sync already asserted the link, which the failure message check rules out.