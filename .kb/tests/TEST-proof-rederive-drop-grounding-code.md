---
title: The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding, by a regex proof
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
    - symbol_id: SYM-proof-rederive-drop-grounding-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE
  proves:
    - CLAIM-D37EB3FBA38FA2D5
origin:
  kind: agent
  recorded_at: '2026-10-28T20:32:07.945Z'
id: TEST-proof-rederive-drop-grounding-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dcce31d03302a9b4a3aef21d
    test_id: TEST-proof-rederive-drop-grounding-code
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:36:29.006Z'
    finished_at: '2026-10-28T20:36:29.164Z'
    artifact_digest: a3f30b0b430ea2253df6e84d81f2dec19871369650c90b2f1277f1f9f0c9cd38
    contract_hash: eeb75be579f09d7da080d253280d2805d6f6094ce5f16012a771b009f0aebf64
    binding_hash: 3de3ff3dcaf0815c04035d9ed3463fd5500a06e031e20e9edbdb312d4ea4bbdf
    fingerprint: 03e0308b3fa0c1408446fc8a1f9b191801eab7c939e6beb007d8c7054b0dd02d
    fingerprint_components:
      contract: eeb75be579f09d7da080d253280d2805d6f6094ce5f16012a771b009f0aebf64
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
      - symbol_id: SYM-proof-rederive-drop-grounding-code
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
      test_id: TEST-proof-rederive-drop-grounding-code
      pattern:
        symbol_id: SYM-schema6-SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE
        type: string
        value: semantic_inventory_rederive_drop_grounding
    certificate_digest: 5e66a5359b42529aad48f26cb1a78093d9cc7169f5e0389e57764490afb53e97
    claim_bindings:
      - claim_key: CLAIM-D37EB3FBA38FA2D5
        requirement_id: REQ-cli-migration-pin-codes
        fact_id: FACT-rederive-drop-grounding-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic_inventory_rederive_drop_grounding
---
Proves that the rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding, against the code Kibi reads at ingest.