---
title: The latest knowledge base schema version shall be 19, by an arithmetic proof
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
    - CLAIM-1EA55F3F05AB0839
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aa2924c29a5f3969d75c47a1
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 33e9b5127d1136410947de6915da5077b98a759907759fce64f80416add4db45
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T15:58:41.068Z'
    finished_at: '2026-11-16T15:58:41.171Z'
    artifact_digest: c7c322faeaa32a057b935659a8ed7d51943b4dce1dcb9380601c39deae8d9168
    contract_hash: 9f13cb1ec5202304f389b7f5664db639adfbddc60c647b6a25b617839eb232a7
    binding_hash: fd4e1a5bb3a86a33cf7604ccf60ede9d3b38fe0310af8b32c7c7c46b39dc7be7
    fingerprint: ea3151cc47c45c44c1c2684a197448b97f8d6385d22b79f9b3f19520766dac98
    fingerprint_components:
      contract: 9f13cb1ec5202304f389b7f5664db639adfbddc60c647b6a25b617839eb232a7
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
          value: 19
      claim:
        operator: eq
        value: 19
    certificate_digest: 5053b1d18536db30bd517023c7962614fae79168ef3a5d8660da64f27a4d0a2f
    claim_bindings:
      - claim_key: CLAIM-1EA55F3F05AB0839
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 19
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 18, against the code Kibi reads at ingest.