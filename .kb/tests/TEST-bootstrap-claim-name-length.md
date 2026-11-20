---
title: Bootstrap claim name length tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a8252410fb30cc60b5e8f1ae
    test_id: TEST-bootstrap-claim-name-length
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c024a2e6c0d0913279a1c33f4c21e4960084bc500d9e3cbd64028d0a5037ae4f
    binding_hash: ce76507abafc332e357fd1ed45909d8e070c90cb2cc5f9c3a0260e6e23806f85
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
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/operations/bootstrap-claim-name-length.test.ts`, which shortens long aspects, plans intent claims and repository Markdown with long and colliding claim names, and checks the planned names, the shortening and disambiguation diagnostics and determinism.