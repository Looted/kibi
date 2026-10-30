---
title: A bootstrap claim aspect shall hold at most 4 words, by an arithmetic proof
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
    - symbol_id: SYM-proof-bootstrap-aspect-max-words
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-max-aspect-words
  proves:
    - CLAIM-080D8C60DC804755
origin:
  kind: agent
  recorded_at: '2026-10-29T16:51:17.221Z'
id: TEST-proof-bootstrap-aspect-max-words
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-31f09b01ad69cce13d45cedb
    test_id: TEST-proof-bootstrap-aspect-max-words
    scope: unit
    outcome: passed
    code_snapshot: e0f271c55f28ef76d28b12bb7a4ce9a61c3b2c2bf54ee95b4744051c4e0237d8
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:52:32.322Z'
    finished_at: '2026-10-29T16:52:32.460Z'
    artifact_digest: a14a26fc24f40e35aa9f095705f0c1bae178c28c3914e69c2ca5c5686104e13a
    contract_hash: aacad75bd6530fe1c97db8fbbc72432ef93105d97fef58cd75447dfe03dbf5b5
    binding_hash: 49d1ccf53ca5fb3d8f8eda1ccd9ab561d6ed3cc1ad9de29ac890e2c32f7828b6
    fingerprint: 7dd5eab5fa3ac0ace14da7629089d18706065b69ffc6a0746b3e93a2b7ab0798
    fingerprint_components:
      contract: aacad75bd6530fe1c97db8fbbc72432ef93105d97fef58cd75447dfe03dbf5b5
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
      - symbol_id: SYM-proof-bootstrap-aspect-max-words
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
      test_id: TEST-proof-bootstrap-aspect-max-words
      variable: max_aspect_words
      value_type: int
      assumptions:
        - operator: eq
          value: 4
      claim:
        operator: eq
        value: 4
    certificate_digest: 5574584be8dc34fec45e5a307350cdaa15a62c9b640e296cacf5a769451fe97a
    claim_bindings:
      - claim_key: CLAIM-080D8C60DC804755
        requirement_id: REQ-bootstrap-claim-aspect-limits
        fact_id: FACT-bootstrap-aspect-max-words
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 4
          value_type: int
          variable: max_aspect_words
---
Proves that a bootstrap claim aspect shall hold at most 4 words, against the code Kibi reads at ingest.