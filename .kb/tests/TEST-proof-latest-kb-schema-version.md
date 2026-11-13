---
title: The latest knowledge base schema version shall be 17, by an arithmetic proof
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
    - CLAIM-26F0900A2030348F
origin:
  kind: agent
  recorded_at: '2026-10-29T10:58:21.157Z'
id: TEST-proof-latest-kb-schema-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-acd76a0dffabbbbf71baa590
    test_id: TEST-proof-latest-kb-schema-version
    scope: unit
    outcome: passed
    code_snapshot: 141bb6c72fe94c000b6806432a7b8208771be0ce3b1713d31f6eb795ba13ce78
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T03:49:06.712Z'
    finished_at: '2026-11-13T03:49:06.815Z'
    artifact_digest: 939b9f4d8f21f0c0aeecb44f5fc86a315162737d0c10c2182747ca587bb8d1a8
    contract_hash: 6216a45a414d588475044d6fdb2d5a5a13468f9b33255728d070376435775dfb
    binding_hash: 225f3167f86b0a35c2fbe896bfcca9c690dc805d6ee73dbb857b885e1fe3e8f6
    fingerprint: 37044567a1023c4bfaf6cfad361d6c79519a14d7ba2a955dceb6ed9e43a47d44
    fingerprint_components:
      contract: 6216a45a414d588475044d6fdb2d5a5a13468f9b33255728d070376435775dfb
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
          value: 17
      claim:
        operator: eq
        value: 17
    certificate_digest: b8892b1b4bb7d8edb11520f2a0f945ab7a1febccc7ef38f5360373ccee7bbeab
    claim_bindings:
      - claim_key: CLAIM-26F0900A2030348F
        requirement_id: REQ-kibi-latest-kb-schema-version
        fact_id: FACT-latest-kb-schema-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 17
          value_type: int
          variable: latest_schema_version
---
Proves that the latest knowledge base schema version shall be 17, against the code Kibi reads at ingest.