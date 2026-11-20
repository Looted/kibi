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
    receipt_id: PR-1b84c6f229287d7b3f47e1de
    test_id: TEST-proof-bootstrap-aspect-max-words
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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