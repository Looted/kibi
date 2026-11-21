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
    receipt_id: PR-155ebc9afb04ddf7d05ec30e
    test_id: TEST-sync-relationship-retry
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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