---
title: A Go source file shall end in .go, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-tree-sitter-go-extensions
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
    export: TREE_SITTER_LANGUAGES.go.extensions
  proves:
    - CLAIM-D3B5367E18F80DF4
origin:
  kind: agent
  recorded_at: '2026-10-28T22:42:15.188Z'
id: TEST-proof-tree-sitter-go-extensions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-912e7289eb6d2c509b0821e7
    test_id: TEST-proof-tree-sitter-go-extensions
    scope: unit
    outcome: passed
    code_snapshot: afb3cdbea213e763f387c3323e2e66996394012a39dd7d3623545ab9b3cd5977
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:42:59.878Z'
    finished_at: '2026-10-28T22:42:59.969Z'
    artifact_digest: bf58b14b75a1323527ae303cc1b1bf92a61dcb1f1afc4463dc6025bb9db0c024
    contract_hash: ce755f11449ad09d137ac4a6bc1b10e8de97e9271cfc99b439ff64744a1b2bfd
    binding_hash: 85f18edfa50f591695449bda9a41760e652f6fe4d1f6d5fe1ce851f5f538b256
    fingerprint: 747a81068f5743761bba80b03dbaa9c70673c3d5814772f9c8d9b36a562e2548
    fingerprint_components:
      contract: ce755f11449ad09d137ac4a6bc1b10e8de97e9271cfc99b439ff64744a1b2bfd
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
      - symbol_id: SYM-proof-tree-sitter-go-extensions
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-tree-sitter-go-extensions
      domain:
        symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
        members:
          - .go
      results:
        - member: .go
          outcome: passed
    certificate_digest: a03153663fa972aeadf668d55cd8492eeb9725a2cea255f85a7efacdc455b329
    claim_bindings:
      - claim_key: CLAIM-D3B5367E18F80DF4
        requirement_id: REQ-tree-sitter-language-set
        fact_id: FACT-tree-sitter-go-extensions
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - .go
---
Proves that a Go source file shall end in .go, against the code Kibi reads at ingest.