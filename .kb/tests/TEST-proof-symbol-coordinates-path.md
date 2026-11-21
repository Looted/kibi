---
title: The symbol coordinates file shall be .kb/symbol-coordinates.yaml, by a regex proof
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
    - symbol_id: SYM-proof-symbol-coordinates-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-SYMBOL-COORDINATES-PATH
  proves:
    - CLAIM-CA13B6BD6887ECD6
origin:
  kind: agent
  recorded_at: '2026-10-28T18:57:44.866Z'
id: TEST-proof-symbol-coordinates-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-058f9958db7999596e07939b
    test_id: TEST-proof-symbol-coordinates-path
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 10b0b8bc4c2ff080bda5f296bd30b478b57319c9183f9fd2f6ffcf0ab50dec8c
    binding_hash: 68b99bc498f942ae62146c99a23aa7dfcd07ac78134a0e81e715b1503d67afcf
    fingerprint: 8788b0240136f6e8a0fe81ef2037949e7db73b3e32d7e6fc97b2ecfc15dbf0ef
    fingerprint_components:
      contract: 10b0b8bc4c2ff080bda5f296bd30b478b57319c9183f9fd2f6ffcf0ab50dec8c
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
      - symbol_id: SYM-proof-symbol-coordinates-path
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
      test_id: TEST-proof-symbol-coordinates-path
      pattern:
        symbol_id: SYM-KIBI-SYMBOL-COORDINATES-PATH
        type: string
        value: .kb/symbol-coordinates.yaml
    certificate_digest: f17b206167875298d6d04e907db84d90e6b1b662fba4a0f60987dc0ed07e1c1c
    claim_bindings:
      - claim_key: CLAIM-CA13B6BD6887ECD6
        requirement_id: REQ-staged-impact-identifiers
        fact_id: FACT-symbol-coordinates-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/symbol-coordinates.yaml
---
Proves that the symbol coordinates file shall be .kb/symbol-coordinates.yaml, against the code Kibi reads at ingest.