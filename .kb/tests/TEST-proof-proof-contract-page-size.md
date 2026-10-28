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
    receipt_id: PR-586fd1f284745eb7b3c429f7
    test_id: TEST-proof-proof-contract-page-size
    scope: unit
    outcome: passed
    code_snapshot: 6f361d2b7a0ce4be8a55a8981006015e29d04d73175b724e90cd4a7d0f2b289f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:24:43.448Z'
    finished_at: '2026-10-28T17:24:43.616Z'
    artifact_digest: 4746efc277328854ee205854ace825a275ae1871cad6fbe5a5950aa220cf2ef2
    contract_hash: a8d07519118edae1a6ced05e13ca70d8674e9a051332fd81c473ea96c03de58a
    binding_hash: 22135f78c2bee7a7a76ef700274721ce29a1eb9bc6833457a7dd38f34132855b
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