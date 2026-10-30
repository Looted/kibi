---
title: The entity schema guide shall be docs/entity-schema.md, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-entity-schema-doc
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-ENTITY-SCHEMA-DOC
  proves:
    - CLAIM-7CE10A9A659DEC27
origin:
  kind: agent
  recorded_at: '2026-10-28T18:58:02.933Z'
id: TEST-proof-entity-schema-doc
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c5fccdada01c0c71785ac414
    test_id: TEST-proof-entity-schema-doc
    scope: unit
    outcome: passed
    code_snapshot: 1525e26386be688f0153859837e8864169cd0c2608dba36204dcab4f0d708d54
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:00:43.643Z'
    finished_at: '2026-10-28T19:00:43.751Z'
    artifact_digest: 220094536e472f62f5f3440d867b115a96005f28500243827461a9f00d542f5e
    contract_hash: 59e94bc41699683a6fb3fb918e823df6d8a64bde1e928c49c5da8025cda6590e
    binding_hash: a3675df538ed9a043829a5f8b5e19d5f7f8a3b26e81cb4dfc10221a484cfac88
    fingerprint: 2c39aaee542f6223d32cf2d8d29d3f7f50a8e1aa1ed3c1d5bf07d4dce90e5e93
    fingerprint_components:
      contract: 59e94bc41699683a6fb3fb918e823df6d8a64bde1e928c49c5da8025cda6590e
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
      - symbol_id: SYM-proof-entity-schema-doc
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-entity-schema-doc
      pattern:
        symbol_id: SYM-KIBI-ENTITY-SCHEMA-DOC
        type: string
        value: docs/entity-schema.md
    certificate_digest: 5371294a4c5508cf5c4654590ffc7d7a59f480bac36960efa355a26519675b85
    claim_bindings:
      - claim_key: CLAIM-7CE10A9A659DEC27
        requirement_id: REQ-staged-impact-identifiers
        fact_id: FACT-entity-schema-doc
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: docs/entity-schema.md
---
Proves that the entity schema guide shall be docs/entity-schema.md, against the code Kibi reads at ingest.