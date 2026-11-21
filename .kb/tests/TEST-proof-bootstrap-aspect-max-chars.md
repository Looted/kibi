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
    receipt_id: PR-270ce59b1b813042a22aacc5
    test_id: TEST-proof-bootstrap-aspect-max-chars
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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