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
    receipt_id: PR-27a0b73ba5ba7e943a0806fe
    test_id: TEST-proof-rederive-drop-grounding-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: eeb75be579f09d7da080d253280d2805d6f6094ce5f16012a771b009f0aebf64
    binding_hash: 20e11191e79d4fbfd20e771dfe5d05dd8228451ff4a73eb31bb1c287c19b2899
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
        requirement_id: REQ-cli-migration-context-codes
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