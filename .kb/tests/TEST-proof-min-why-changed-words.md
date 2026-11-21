---
title: The minimum supersede explanation length shall be 12 words, by an arithmetic proof
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
    - symbol_id: SYM-proof-min-why-changed-words
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-decision-firmness-min-why-words
  proves:
    - CLAIM-18032217B0DD0A8E
origin:
  kind: agent
  recorded_at: '2026-10-28T10:34:07.065Z'
id: TEST-proof-min-why-changed-words
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6f5fc28c9bbefac8ae158724
    test_id: TEST-proof-min-why-changed-words
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a3049126037d577d3bdc8cb0c159c0361e044bdc28317ebfbf45298832dcd771
    binding_hash: 873956629174884c2f67fba8e1bc94d0ece8c3b92a6e2f1d26ec36915692f15e
    fingerprint: 3816bb25edbcbdcd752783f098e57d9988dd0908bbd95fb909154c3de8110b60
    fingerprint_components:
      contract: a3049126037d577d3bdc8cb0c159c0361e044bdc28317ebfbf45298832dcd771
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
      - symbol_id: SYM-proof-min-why-changed-words
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
      test_id: TEST-proof-min-why-changed-words
      variable: min_why_changed_words
      value_type: int
      assumptions:
        - operator: eq
          value: 12
      claim:
        operator: eq
        value: 12
    certificate_digest: 4e022e2e40e39beb323b879d7e2e0ec24040957b31505bfdff07372be2198279
    claim_bindings:
      - claim_key: CLAIM-18032217B0DD0A8E
        requirement_id: REQ-kb-decision-firmness-settings
        fact_id: FACT-min-why-changed-words
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 12
          value_type: int
          variable: min_why_changed_words
---
Proves that the minimum supersede explanation length shall be 12 words, against the code Kibi reads at ingest.