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
    receipt_id: PR-2c6d5a0ca29d81aa3c9aa9f3
    test_id: TEST-proof-engine-query-limit-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f79749ff667b1c7fc1c2cda4e60bdeae667600d5a4b374609d409421c18ad5f1
    binding_hash: af3de825b8ea1ce53e24941babb4636f8d65e05edd6cfacd5f399ec80df45625
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