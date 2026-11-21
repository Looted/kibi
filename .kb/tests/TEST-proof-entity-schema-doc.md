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
    receipt_id: PR-5081a036eac6e09647e2f691
    test_id: TEST-proof-entity-schema-doc
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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