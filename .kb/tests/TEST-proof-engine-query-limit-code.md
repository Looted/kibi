---
title: The error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED, by a regex proof
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
    - symbol_id: SYM-proof-engine-query-limit-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-engine-limits-query-limit-exceeded-code
  proves:
    - CLAIM-D353B291DCC8ABF9
origin:
  kind: agent
  recorded_at: '2026-10-28T10:31:34.572Z'
id: TEST-proof-engine-query-limit-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d2e7c8b17e51c35941eed235
    test_id: TEST-proof-engine-query-limit-code
    scope: unit
    outcome: passed
    code_snapshot: 7e969ef237f833cbd278efff81b932f3dfabb54a084313f49df8411b804224eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:32:38.645Z'
    finished_at: '2026-10-28T10:32:38.763Z'
    artifact_digest: d5ec849dbb903f0fb165a2c6b2675d7faf07eec4b3895f90f6c5fe59a95104fe
    contract_hash: f79749ff667b1c7fc1c2cda4e60bdeae667600d5a4b374609d409421c18ad5f1
    binding_hash: 6fd8ea4d2b190b0ceeb84acee4b8db02d1beb9469ea3df7cc01fc540e0c26532
    fingerprint: 3627c98ef45aff8ac8540ff53955e0ea7cb7fda8e22ce019562515479c6c6107
    fingerprint_components:
      contract: f79749ff667b1c7fc1c2cda4e60bdeae667600d5a4b374609d409421c18ad5f1
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
      - symbol_id: SYM-proof-engine-query-limit-code
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
      test_id: TEST-proof-engine-query-limit-code
      pattern:
        symbol_id: SYM-engine-limits-query-limit-exceeded-code
        type: string
        value: QUERY_LIMIT_EXCEEDED
    certificate_digest: f23813161bdfc8b2f1432b55c6fefcb3a98ed4264dfe88d43f8d97d319bc64fc
    claim_bindings:
      - claim_key: CLAIM-D353B291DCC8ABF9
        requirement_id: REQ-core-engine-read-limit-settings
        fact_id: FACT-engine-query-limit-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: QUERY_LIMIT_EXCEEDED
---
Proves that the error code of a read that hits its limit shall be QUERY_LIMIT_EXCEEDED, against the code Kibi reads at ingest.