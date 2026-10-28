---
title: The firm supersede acknowledgement code shall be firm_supersede_acknowledge, by a regex proof
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
    - symbol_id: SYM-proof-firm-supersede-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-firm-supersede-acknowledge-code
  proves:
    - CLAIM-5E5165DB903B6897
origin:
  kind: agent
  recorded_at: '2026-10-28T20:31:00.625Z'
id: TEST-proof-firm-supersede-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8ad6ff6db8b32a5db8c45d4f
    test_id: TEST-proof-firm-supersede-code
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:36:11.153Z'
    finished_at: '2026-10-28T20:36:11.329Z'
    artifact_digest: d4c86cbb0bf2f38200d239a0bf6194b069863849496bbc1c6b724304bdebf341
    contract_hash: 1d7e428a19014ac1c97051e05b0f7204e89e270ec1351abf2ff96586ae8e4f95
    binding_hash: ebdc864707ea31da810f96ba240a31948f3e0a077767f21b25fa623445d51404
    fingerprint: 9b151155a06018e5a015e2c435a98b1dec7626dfacf47e5b2caca20c245e7b68
    fingerprint_components:
      contract: 1d7e428a19014ac1c97051e05b0f7204e89e270ec1351abf2ff96586ae8e4f95
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
      - symbol_id: SYM-proof-firm-supersede-code
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
      test_id: TEST-proof-firm-supersede-code
      pattern:
        symbol_id: SYM-const-firm-supersede-acknowledge-code
        type: string
        value: firm_supersede_acknowledge
    certificate_digest: 47bef0e1b4e251bfba66ce36c1ab99b5311b35608128828a1614906bd75f2220
    claim_bindings:
      - claim_key: CLAIM-5E5165DB903B6897
        requirement_id: REQ-cli-migration-pin-codes
        fact_id: FACT-firm-supersede-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: firm_supersede_acknowledge
---
Proves that the firm supersede acknowledgement code shall be firm_supersede_acknowledge, against the code Kibi reads at ingest.