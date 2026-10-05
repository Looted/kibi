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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7d1134bad23589f1d3d2610b
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
    binding_hash: 77d6db552f88d0c037e3e883c932c25b0a2a9cf421eef21809d71ef9be7f4255
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Exercises `kibi.legacy-migration-plan.v1` through focused CLI and MCP integration tests plus a fresh packed CLI installation, including deterministic pagination, exact source hashes and spans, schema provenance, conflict blocking, and read-only behavior.
