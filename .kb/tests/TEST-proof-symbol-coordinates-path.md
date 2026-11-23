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
    receipt_id: PR-87921214123c584475079eda
    test_id: TEST-proof-symbol-coordinates-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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