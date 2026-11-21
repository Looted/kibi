---
title: The symbol granularity rule shall be symbol-granularity, by a regex proof
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
    - symbol_id: SYM-proof-symbol-granularity-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-symbol-granularity-rule
  proves:
    - CLAIM-5C7C8091600FD22F
origin:
  kind: agent
  recorded_at: '2026-10-28T20:22:57.216Z'
id: TEST-proof-symbol-granularity-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fc9c68e8de6dde0e9a950b2f
    test_id: TEST-proof-symbol-granularity-rule
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f53cd3e4da1545ae78778bca9a6087db8a6fdf5ec8ef8062fc36a20bfce6a98d
    binding_hash: 31832862ca3874ee6928638639d32072a6e971343ec86165bfe2e3fdd9dbc17c
    fingerprint: cd2cc21ed93f7e2f0d59cb9268cd4e531e262a65955cda456d9eea074cc43040
    fingerprint_components:
      contract: f53cd3e4da1545ae78778bca9a6087db8a6fdf5ec8ef8062fc36a20bfce6a98d
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
      - symbol_id: SYM-proof-symbol-granularity-rule
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
      test_id: TEST-proof-symbol-granularity-rule
      pattern:
        symbol_id: SYM-const-symbol-granularity-rule
        type: string
        value: symbol-granularity
    certificate_digest: 0c3c9a78fd1459759a46cc5c49e68ca02aa5fb04d1ec82c62838242e59451e9d
    claim_bindings:
      - claim_key: CLAIM-5C7C8091600FD22F
        requirement_id: REQ-kibi-symbol-and-supersede-rule-names
        fact_id: FACT-symbol-granularity-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: symbol-granularity
---
Proves that the symbol granularity rule shall be symbol-granularity, against the code Kibi reads at ingest.