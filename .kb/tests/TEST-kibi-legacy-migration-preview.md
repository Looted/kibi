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
    receipt_id: PR-99ab1ae3a4f2777a06109585
    test_id: TEST-kibi-legacy-migration-preview
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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
