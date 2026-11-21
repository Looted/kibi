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
    receipt_id: PR-6d170335719bdf304a933893
    test_id: TEST-proof-advertised-description-limit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f216bf12765fb6f608a9f23a5ed36eb1b8715284a1302387556cd472c3a4e7c9
    binding_hash: 3f89019d29133b4294f71b94fcb28d5a96bba311b0c58c875795ebf0c529e791
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