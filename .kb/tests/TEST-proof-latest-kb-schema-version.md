---
title: The latest knowledge base schema version shall be 13, by an arithmetic proof
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
    - CLAIM-FE5C9D3D6AB1DEB5
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0d445a2c58cb630be1faa619
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 7f95b60fc7c9571f2ac61dfd41473f2975dea1d250d6b29ca38549f7d6503d2e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:59:11.758Z'
    finished_at: '2026-10-29T10:59:11.956Z'
    artifact_digest: ae71d09b305b9f443f1502a37016e0701ba8ec96d9b57a7768e9ea7ade17871c
    contract_hash: 8cea6a795366cd9554e314ace2a65f8fb27018e7ed2442d88bdce503e31267c6
    binding_hash: 8a000db23744b8cc5233ddd92b3d49540b2a7a1bf82d57dc33e85872916d020b
    fingerprint: 814272ee9862468b477e4958abeb3727fded7d87f538cbbe234cebd30fc72ada
    fingerprint_components:
      contract: 8cea6a795366cd9554e314ace2a65f8fb27018e7ed2442d88bdce503e31267c6
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
          value: 13
      claim:
        operator: eq
        value: 13
    certificate_digest: 1e09003fc1a890afe780dfb0d16375905d5bffae0508acde220a622f9d4b6c1d
    claim_bindings:
      - claim_key: CLAIM-FE5C9D3D6AB1DEB5
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 13
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 13, against the code Kibi reads at ingest.