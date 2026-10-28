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
    receipt_id: PR-33529b95de8f68608fca5959
    test_id: TEST-proof-symbol-coordinates-path
    scope: unit
    outcome: passed
    code_snapshot: 1525e26386be688f0153859837e8864169cd0c2608dba36204dcab4f0d708d54
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:00:38.140Z'
    finished_at: '2026-10-28T19:00:38.246Z'
    artifact_digest: 0d04ed76b4507da2fe577da326c927110974380012a838f9edfba880f8c9919f
    contract_hash: 10b0b8bc4c2ff080bda5f296bd30b478b57319c9183f9fd2f6ffcf0ab50dec8c
    binding_hash: 574087bbabdc6f5f2d8d74e9c42a79ed72a218517345bfcbd4f0a39bc75be8a6
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