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
    receipt_id: PR-946c2be81d48b53f139966be
    test_id: TEST-proof-bootstrap-aspect-max-words
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: aacad75bd6530fe1c97db8fbbc72432ef93105d97fef58cd75447dfe03dbf5b5
    binding_hash: e6f87c831569ef8de47c4197a77f0d36a2dc832c4b6274b5e50db0c6c78a0db0
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