---
id: TEST-kibi-legacy-migration-preview
title: Legacy migration preview vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - requirements
  - migration
  - semantics
  - source-binding
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-legacy-migration-plan
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0048036a2fe4c4f952e6b269
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
    binding_hash: 01aacd8cf88989b7cb80b59bad7b8853ed513ec1afcc3aedcfe071ab550ca856
    fingerprint: 4fa230ab40e85cd549b170f47eeaeffc86cf4e32e566685a57a2a87370c345a4
    fingerprint_components:
      contract: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
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
      - symbol_id: SYM-e2e-test-legacy-migration-plan
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

Exercises `kibi.legacy-migration-plan.v1` through focused CLI and MCP integration tests plus a fresh packed CLI installation, including deterministic pagination, exact source hashes and spans, schema provenance, conflict blocking, and read-only behavior.
