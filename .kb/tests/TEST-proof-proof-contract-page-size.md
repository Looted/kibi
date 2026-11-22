---
title: A proof contract page shall hold at most 100 contracts, by an arithmetic proof
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
    - symbol_id: SYM-proof-proof-contract-page-size
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-discovery-proof-contract-page-size
  proves:
    - CLAIM-22447215368AF5E5
origin:
  kind: agent
  recorded_at: '2026-10-28T17:22:48.612Z'
id: TEST-proof-proof-contract-page-size
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fd6d246600239cac9a9f0ae1
    test_id: TEST-proof-proof-contract-page-size
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: a8d07519118edae1a6ced05e13ca70d8674e9a051332fd81c473ea96c03de58a
    binding_hash: 3212c4b59e4c8a1b36393d2f9aeb0ae023ce95d9745123b3dd14552985d0e151
    fingerprint: 5969e9f1106cedec9d0b57e43a7cf7e056679ff5d12cde2ead9e480c3ef97025
    fingerprint_components:
      contract: a8d07519118edae1a6ced05e13ca70d8674e9a051332fd81c473ea96c03de58a
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
      - symbol_id: SYM-proof-proof-contract-page-size
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
      test_id: TEST-proof-proof-contract-page-size
      variable: proof_contract_page_size
      value_type: int
      assumptions:
        - operator: eq
          value: 100
      claim:
        operator: eq
        value: 100
    certificate_digest: fc91e398a93e4f284d2260af8e040e8e8326d76d4e5f485c4309689da004e975
    claim_bindings:
      - claim_key: CLAIM-22447215368AF5E5
        requirement_id: REQ-kibi-operation-page-sizes
        fact_id: FACT-proof-contract-page-size
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 100
          value_type: int
          variable: proof_contract_page_size
---
Proves that a proof contract page shall hold at most 100 contracts, against the code Kibi reads at ingest.