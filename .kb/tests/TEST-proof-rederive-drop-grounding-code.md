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
    receipt_id: PR-e00cc40d57ffb49266827bfa
    test_id: TEST-proof-rederive-drop-grounding-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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