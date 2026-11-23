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
    receipt_id: PR-dd34ddb86284341f51708d34
    test_id: TEST-proof-entity-schema-doc
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 59e94bc41699683a6fb3fb918e823df6d8a64bde1e928c49c5da8025cda6590e
    binding_hash: aa8079c95fd1c44fc179afe6f5e1ca041364b10c6d5711ba47975acdb23dd27b
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