---
title: The latest knowledge base schema version shall be 16, by an arithmetic proof
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
    - CLAIM-78DB113BD0A6AB46
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-184bdc3ba67e9068a2342bb5
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 3fc3e2e3094efa2eabfd7872c20abdb5da6945a5aded8e7f85434893b7a4f29c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T20:32:32.688Z'
    finished_at: '2026-11-12T20:32:32.827Z'
    artifact_digest: 60a9f655fbb9adc2209be5156fd94b640151157b2d8fd8b2b5078db2f70abdd9
    contract_hash: 4252ca2208355c43feb4cf72875ad39a1b0a628d407f131a87fa4be01dcd5921
    binding_hash: fe23a14cc869f41b1e4d48b1afa7aa7d2a58780cbf1120a532c6576dab23b7c8
    fingerprint: 70507eb429fc7bcbe0eb5d34ac059310d67af207aa4a38a2d1e64289599cdf2f
    fingerprint_components:
      contract: 4252ca2208355c43feb4cf72875ad39a1b0a628d407f131a87fa4be01dcd5921
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
          value: 16
      claim:
        operator: eq
        value: 16
    certificate_digest: 7d4c7bf8660aea53e3b1e14482626dbdf3935f513a8805f341befb50a7cd74b9
    claim_bindings:
      - claim_key: CLAIM-78DB113BD0A6AB46
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 16
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 16, against the code Kibi reads at ingest.