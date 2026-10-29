---
title: A bootstrap claim aspect shall hold at most 40 characters, by an arithmetic proof
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
    - symbol_id: SYM-proof-bootstrap-aspect-max-chars
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-max-aspect-chars
  proves:
    - CLAIM-B87D307EEB317415
origin:
  kind: agent
  recorded_at: '2026-10-29T16:51:57.460Z'
id: TEST-proof-bootstrap-aspect-max-chars
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-660790576957a0210f6453e8
    test_id: TEST-proof-bootstrap-aspect-max-chars
    scope: unit
    outcome: passed
    code_snapshot: e0f271c55f28ef76d28b12bb7a4ce9a61c3b2c2bf54ee95b4744051c4e0237d8
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:52:42.805Z'
    finished_at: '2026-10-29T16:52:42.973Z'
    artifact_digest: 440be9451bb764e917bcdf992130671c2a20162645007b0432591d4f6da32647
    contract_hash: 9a063ba75e566e704f53625008b3c71e8d3f9956904fb637d886de31ab926ab2
    binding_hash: 074096df1b59d7fb048768abb88d938e97901e5fb11cea4cbf56502229d27841
    fingerprint: b1c40f34c378e4c070a6ee882927e796613189bc3b2c42c6b68de2dafb0e9942
    fingerprint_components:
      contract: 9a063ba75e566e704f53625008b3c71e8d3f9956904fb637d886de31ab926ab2
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
      - symbol_id: SYM-proof-bootstrap-aspect-max-chars
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
      test_id: TEST-proof-bootstrap-aspect-max-chars
      variable: max_aspect_chars
      value_type: int
      assumptions:
        - operator: eq
          value: 40
      claim:
        operator: eq
        value: 40
    certificate_digest: 9c46420840a36b8253d8eca145637710138183342475d9f49be5edca9ba078ae
    claim_bindings:
      - claim_key: CLAIM-B87D307EEB317415
        requirement_id: REQ-bootstrap-claim-aspect-limits
        fact_id: FACT-bootstrap-aspect-max-chars
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 40
          value_type: int
          variable: max_aspect_chars
---
Proves that a bootstrap claim aspect shall hold at most 40 characters, against the code Kibi reads at ingest.