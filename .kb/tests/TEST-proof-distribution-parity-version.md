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
    receipt_id: PR-2ec0a2ce4fd55da347f1c491
    test_id: TEST-proof-distribution-parity-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: fef64d22aefc21d76536da1c3229772ec8a514f114f49eb694137c80abd07ced
    binding_hash: 5847027c58ce57c8620fb53f36f7758d9a1feb81cc2ccde67cc4cc2dc648c7c2
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