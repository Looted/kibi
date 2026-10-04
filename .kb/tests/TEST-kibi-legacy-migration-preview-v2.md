---
id: TEST-kibi-legacy-migration-preview-v2
title: Semantic source separation packed vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: .kb/tests/TEST-kibi-legacy-migration-preview-v2.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - requirements
  - migration
  - semantics
  - source-binding
  - e2e
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview-v2
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
priority: must
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
    receipt_id: PR-b0acba1e148a2933c2a82478
    test_id: TEST-kibi-legacy-migration-preview-v2
    scope: end_to_end
    outcome: passed
    code_snapshot: 47e9a559411c2a3f13fc23b90f6947598147507ec5cbc766943cde1e98b6f42d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T04:20:05.717Z'
    finished_at: '2026-10-04T04:20:05.896Z'
    artifact_digest: 2c0eed4dadcd5d850f6c1d83c03e36383ca7a6fcb4e5888351b7804bf2e4bc65
    contract_hash: e43e6883dc1d0c5664a2d02112e4fd9ce07d2684f16d7ad49d934b3e69cb77b6
    binding_hash: a653d2626b1fc01aef6e204cb6a4650bd439abaae5cc55d45cf63ee354563bd2
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
---

Exercises semantic-source separation through focused CLI, Core, and MCP contract tests plus a fresh packed installation. It proves that authored prose is persisted and previewed through `semantic_text`, independent `text_ref` evidence is retained, semantic source drift fails closed, CLI and MCP return equivalent plans, and preview calls do not mutate source or KB state.
