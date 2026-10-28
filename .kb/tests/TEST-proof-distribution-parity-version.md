---
title: The distribution parity version shall be kibi.distribution-parity.v1, by a regex proof
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
    - symbol_id: SYM-proof-distribution-parity-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-reqcompiler-parity-version
  proves:
    - CLAIM-165E7DDE624AD22E
origin:
  kind: agent
  recorded_at: '2026-10-28T21:06:21.336Z'
id: TEST-proof-distribution-parity-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ef2f8ad8230d5ce4bcb9c109
    test_id: TEST-proof-distribution-parity-version
    scope: unit
    outcome: passed
    code_snapshot: 8e88f2df9df47129cd4d443d8986fb3321064fec2931da63592501fcb3219147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:08:01.824Z'
    finished_at: '2026-10-28T21:08:01.925Z'
    artifact_digest: 14c50c5f3af209a29e0270f435accc7b456a02980c37297c8731e7ccfe2c9e04
    contract_hash: fef64d22aefc21d76536da1c3229772ec8a514f114f49eb694137c80abd07ced
    binding_hash: 8e3c26cec432ee406194fed65683c872dc05b4ddc114cce20769924ea90b3582
    fingerprint: aa05775647f24b4e09609305ea40370fa4f0cecfb3f9c43ca63af0cfd03b1c2e
    fingerprint_components:
      contract: fef64d22aefc21d76536da1c3229772ec8a514f114f49eb694137c80abd07ced
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
      - symbol_id: SYM-proof-distribution-parity-version
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
      test_id: TEST-proof-distribution-parity-version
      pattern:
        symbol_id: SYM-reqcompiler-parity-version
        type: string
        value: kibi.distribution-parity.v1
    certificate_digest: b12000c67bfb41f30f1b1ccbae57e3789ee16eb224dd849b6ab8519f5ad48fbd
    claim_bindings:
      - claim_key: CLAIM-165E7DDE624AD22E
        requirement_id: REQ-kibi-distribution-parity-version
        fact_id: FACT-distribution-parity-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.distribution-parity.v1
---
Proves that the distribution parity version shall be kibi.distribution-parity.v1, against the code Kibi reads at ingest.