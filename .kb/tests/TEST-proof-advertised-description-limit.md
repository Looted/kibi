---
title: The advertised field description limit shall be 120 characters, by an arithmetic proof
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
    - symbol_id: SYM-proof-advertised-description-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-advertised-description-limit
  proves:
    - CLAIM-AF257391602037F6
origin:
  kind: agent
  recorded_at: '2026-11-16T11:02:33.167Z'
id: TEST-proof-advertised-description-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b81cc838719b15b2eea6b7b5
    test_id: TEST-proof-advertised-description-limit
    scope: unit
    outcome: passed
    code_snapshot: 5434da306c269b06f3ab3332686aeca47fd3a0e8a998befaf06388d5c53900c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:16:23.881Z'
    finished_at: '2026-11-16T12:16:35.346Z'
    artifact_digest: 84f6264dbdbe7bf5f491653f9074c5e90c7ff04719f9916d8f263426af8b9108
    contract_hash: f216bf12765fb6f608a9f23a5ed36eb1b8715284a1302387556cd472c3a4e7c9
    binding_hash: 049318c96d19b86cff9e12b92b4e3ef440b22e00590e09eaffa7f32800f8985d
    fingerprint: c4bcf6a23368fa50a87dd049dc477004c74267f1368d51e4ca4b6c3112fe2d31
    fingerprint_components:
      contract: f216bf12765fb6f608a9f23a5ed36eb1b8715284a1302387556cd472c3a4e7c9
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
      - symbol_id: SYM-proof-advertised-description-limit
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
      test_id: TEST-proof-advertised-description-limit
      variable: advertised_description_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 120
      claim:
        operator: eq
        value: 120
    certificate_digest: c4f6dff4bcd748bef059b10bc0c76abfbfb9abe215a59d808632c2e43f2deca0
    claim_bindings:
      - claim_key: CLAIM-AF257391602037F6
        requirement_id: REQ-mcp-short-field-descriptions
        fact_id: FACT-mcp-advertised-description-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 120
          value_type: int
          variable: advertised_description_limit
---
Proves that the advertised field description limit shall be 120 characters, against the code Kibi reads at ingest.