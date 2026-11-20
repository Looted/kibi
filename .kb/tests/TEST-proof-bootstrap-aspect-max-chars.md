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
    receipt_id: PR-c32f2ca7f9c51b9a62c68906
    test_id: TEST-proof-bootstrap-aspect-max-chars
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9a063ba75e566e704f53625008b3c71e8d3f9956904fb637d886de31ab926ab2
    binding_hash: 314e2be38dcd6e099d9ed9cd26ff0ca53507305c3d5ccde8bf5de04e5e7347b1
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