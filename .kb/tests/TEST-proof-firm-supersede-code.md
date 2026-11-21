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
    receipt_id: PR-41a6dfc077400db18dc442db
    test_id: TEST-proof-firm-supersede-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1d7e428a19014ac1c97051e05b0f7204e89e270ec1351abf2ff96586ae8e4f95
    binding_hash: 2d4bf37e556194275aee4157e6667b5a9d8ae36b102a9cce00058ccde6434c1e
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
        requirement_id: REQ-cli-migration-supersession-codes
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