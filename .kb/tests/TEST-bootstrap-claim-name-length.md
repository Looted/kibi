---
title: Bootstrap claim name length tests
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - naming
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-claim-name-length
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T09:14:09.400Z'
id: TEST-bootstrap-claim-name-length
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8fa96dd6178298a811a44c0f
    test_id: TEST-bootstrap-claim-name-length
    scope: end_to_end
    outcome: passed
    code_snapshot: 958d97d1ca714d740f6d17315006a0e8f256102a370d9ee44f2b88223fb57c12
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T09:33:57.508Z'
    finished_at: '2026-10-08T09:33:57.637Z'
    artifact_digest: 9fd0e85780a3fe84d2700acde632ff5abd1f88b7b06d924a8aa02f8ae4eb3139
    contract_hash: c024a2e6c0d0913279a1c33f4c21e4960084bc500d9e3cbd64028d0a5037ae4f
    binding_hash: 2066991902aa82d0aa1e59193054d14425190d51672f737f37c3b8baa26bc5a0
    fingerprint: 8db04a1695904e4127675e5294fd799797a74fc5b8202ef951d85a13ac469d06
    fingerprint_components:
      contract: c024a2e6c0d0913279a1c33f4c21e4960084bc500d9e3cbd64028d0a5037ae4f
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
      - symbol_id: SYM-test-bootstrap-claim-name-length
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/cli/tests/operations/bootstrap-claim-name-length.test.ts`, which shortens long aspects, plans intent claims and repository Markdown with long and colliding claim names, and checks the planned names, the shortening and disambiguation diagnostics and determinism.