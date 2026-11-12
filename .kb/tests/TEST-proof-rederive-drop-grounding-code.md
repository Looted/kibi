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
    receipt_id: PR-79632f4f21ec1054997940f2
    test_id: TEST-proof-rederive-drop-grounding-code
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:33.215Z'
    finished_at: '2026-11-04T18:30:33.358Z'
    artifact_digest: 1e0e02ab7b52f79acf8ee1606853728d73e451de067301dc47af4a6c0b1cc70e
    contract_hash: eeb75be579f09d7da080d253280d2805d6f6094ce5f16012a771b009f0aebf64
    binding_hash: be7e0fced131ce2b2baf3cc5ec1a06dde390205ca0ae8ae05198ba454cb7397c
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