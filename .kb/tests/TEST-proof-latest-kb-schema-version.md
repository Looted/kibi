---
title: The latest knowledge base schema version shall be 15, by an arithmetic proof
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
    - CLAIM-38D7520945D017E1
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-15127219bdef6c67ba73f5be
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 90d897131336136fba35fe230b82dd26513c6113262264682ec0edd6337b2257
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T18:46:42.514Z'
    finished_at: '2026-11-12T18:46:53.087Z'
    artifact_digest: ccf34cbd7d69c61a16e4b941bd5c9d73e15a475647e5683825a97080bece0eee
    contract_hash: c7f4aadf62eb1b4c699bd9429924f61a5c9892728ba4efb1d4148aacaad91fef
    binding_hash: f5c347686f6ad0be5ca268a4bb1f451bd6b2bc231d9f774e96512acbe5efc4da
    fingerprint: 8f8e5a580e61fb949532e0a71630925fe4e8758c28f3899cea81adc4395b6e10
    fingerprint_components:
      contract: c7f4aadf62eb1b4c699bd9429924f61a5c9892728ba4efb1d4148aacaad91fef
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
          value: 15
      claim:
        operator: eq
        value: 15
    certificate_digest: a0af0baf0300c59af34a1916e7733843f8baf6ea17167a3b6ac63c1e36b42d36
    claim_bindings:
      - claim_key: CLAIM-38D7520945D017E1
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 15
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 15, against the code Kibi reads at ingest.