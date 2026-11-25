---
title: The latest knowledge base schema version shall be 20, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-latest-kb-schema-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-LATEST-KB-SCHEMA-VERSION
  proves:
    - CLAIM-A86B00C9168C511B
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bf57371e4ae4f8485958c848
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: d0fac2038288339f0112aca896675ea6c3d06a4acc9cb434868aaf1d17036a11
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:16:35.815Z'
    finished_at: '2026-11-25T10:16:35.916Z'
    artifact_digest: d3f722bd6052e7f92b547286d33547860484e08a582d759e9bbd149b186ea817
    contract_hash: 69d652556582b6bcc7a314b5839fdb70ab2551d7c92c339e656bd042c4daefb6
    binding_hash: 4f164ab263b2e0e818edae9de995c19964500fa74eebfceef1b9a47d0670a4b1
    fingerprint: fc9c236422569b442a71bfb615d6631bebf008ff027d05ef40c2f018d6d914ae
    fingerprint_components:
      contract: 69d652556582b6bcc7a314b5839fdb70ab2551d7c92c339e656bd042c4daefb6
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
      - symbol_id: SYM-proof-latest-kb-schema-version
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-latest-kb-schema-version
      variable: latest_schema_version
      value_type: int
      assumptions:
        - operator: eq
          value: 20
      claim:
        operator: eq
        value: 20
    certificate_digest: d331a9ce6b95a41829ba2f33bcc91a9c0d3f0d70df733ca6c2db9b18d064aaab
    claim_bindings:
      - claim_key: CLAIM-A86B00C9168C511B
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 20
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 20, against the code Kibi reads at ingest.
