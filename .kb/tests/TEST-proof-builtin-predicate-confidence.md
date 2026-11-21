---
title: A built-in predicate rule match shall have confidence 0.84, by an arithmetic proof
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
    - symbol_id: SYM-proof-builtin-predicate-confidence
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cap-plugin-builtin-predicate-confidence-685e50a6
  proves:
    - CLAIM-A645E9005AAD5364
origin:
  kind: agent
  recorded_at: '2026-10-29T17:00:35.170Z'
id: TEST-proof-builtin-predicate-confidence
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-48a4368d0f9b19584da7cb22
    test_id: TEST-proof-builtin-predicate-confidence
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d584ca6d2f33b6a856f6e3400bd9bcb811250ad2640fea65e961380a5c559bb7
    binding_hash: 8b189fb5a064356f9a97ec418f68d348816a01df2d5ca9bce06339f4f7816ad5
    fingerprint: 05132d4a643a39b5e4730d9fa014b29614c7597f4f511f96b794571a3ab37ca3
    fingerprint_components:
      contract: d584ca6d2f33b6a856f6e3400bd9bcb811250ad2640fea65e961380a5c559bb7
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
      - symbol_id: SYM-proof-builtin-predicate-confidence
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
      test_id: TEST-proof-builtin-predicate-confidence
      variable: rule_confidence
      value_type: real
      assumptions:
        - operator: eq
          value: 0.84
      claim:
        operator: eq
        value: 0.84
    certificate_digest: 3d63a6968f8b63157116b093b12878e3f3bd4bec0c86ff5b8c2a67e4505af57a
    claim_bindings:
      - claim_key: CLAIM-A645E9005AAD5364
        requirement_id: REQ-capability-builtin-predicate-confidence
        fact_id: FACT-builtin-predicate-confidence
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.84
          value_type: real
          variable: rule_confidence
---
Proves that a built-in predicate rule match shall have confidence 0.84, against the code Kibi reads at ingest.