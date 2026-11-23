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
    receipt_id: PR-25d2cdbb8855015ff6567863
    test_id: TEST-proof-tree-sitter-go-extensions
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: ce755f11449ad09d137ac4a6bc1b10e8de97e9271cfc99b439ff64744a1b2bfd
    binding_hash: d8bd66e1e5496caad4cce7e11c0b70eae26a9d23eb81d776fb402e3c3a6ad65f
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