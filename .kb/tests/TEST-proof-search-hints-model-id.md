---
title: The search hints embedding model shall be minishlab/potion-retrieval-32M, by a regex proof
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
    - symbol_id: SYM-proof-search-hints-model-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-519FA42596BB464F
  pattern_source:
    symbol_id: SYM-const-search-hints-model-id
origin:
  kind: agent
  recorded_at: '2026-10-30T19:40:19.833Z'
id: TEST-proof-search-hints-model-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b500c2c4a7b590deaec2af6c
    test_id: TEST-proof-search-hints-model-id
    scope: unit
    outcome: passed
    code_snapshot: 4214ab923482916d6a4859a4435df49c593b32b479cd25c478933bd6c07eb4ee
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T18:22:53.384Z'
    finished_at: '2026-11-24T18:22:54.181Z'
    artifact_digest: 2b0bfc8b8d724dcd12a0ace753f190419cdc0458cc18e0bed29652e7e1c0eed4
    contract_hash: cbb020383b80045cc0a79f61c976ef238692806fd3e6e8ff934fb02b9288cb4b
    binding_hash: 8ae491032763fdb91f07978f8cb77d3d8229230f62fe6a9db9a5fabc697c2b35
    fingerprint: b03972dea4066a13ead7b883a2502d6ec989db122204a71aa3537af6f20658bd
    fingerprint_components:
      contract: cbb020383b80045cc0a79f61c976ef238692806fd3e6e8ff934fb02b9288cb4b
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
      - symbol_id: SYM-proof-search-hints-model-id
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
      test_id: TEST-proof-search-hints-model-id
      pattern:
        symbol_id: SYM-const-search-hints-model-id
        type: string
        value: minishlab/potion-retrieval-32M
    certificate_digest: 6502f22a3fba387bbabd2d9f7bdd2e26e471e4e00684c8e108433f3ba9e04f6c
    claim_bindings:
      - claim_key: CLAIM-519FA42596BB464F
        requirement_id: REQ-search-hints-model-pin
        fact_id: FACT-search-hints-model-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: minishlab/potion-retrieval-32M
---
Proves that the search hints embedding model shall be minishlab/potion-retrieval-32M, against the code Kibi reads at ingest.