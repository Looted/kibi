---
title: A Rust source file shall end in .rs, by an exhaustive proof
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
    - symbol_id: SYM-proof-tree-sitter-rust-extensions
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
    export: TREE_SITTER_LANGUAGES.rust.extensions
  proves:
    - CLAIM-D5BAED30A693179C
origin:
  kind: agent
  recorded_at: '2026-10-28T22:42:31.589Z'
id: TEST-proof-tree-sitter-rust-extensions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d81d992d1d507d34b9756482
    test_id: TEST-proof-tree-sitter-rust-extensions
    scope: unit
    outcome: passed
    code_snapshot: afb3cdbea213e763f387c3323e2e66996394012a39dd7d3623545ab9b3cd5977
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:43:04.938Z'
    finished_at: '2026-10-28T22:43:05.022Z'
    artifact_digest: 0367bfaf2aa6a41fc17432e6aff93edb11b32c37e6bb082d21bdcc3e9997e307
    contract_hash: ff5b194f6a7b64529a4127974d490f325fa2375046010067afa959cf00629a63
    binding_hash: 9e16797df74feeb94dfa31399470f9ce14e4c07d455c0d79b64fcd4b82b13fe7
    fingerprint: 8dd14202d182083fef0af95f4d5d56ac62740c32c91f6408121b84a1ff2144d5
    fingerprint_components:
      contract: ff5b194f6a7b64529a4127974d490f325fa2375046010067afa959cf00629a63
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
      - symbol_id: SYM-proof-tree-sitter-rust-extensions
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
      test_id: TEST-proof-tree-sitter-rust-extensions
      domain:
        symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
        members:
          - .rs
      results:
        - member: .rs
          outcome: passed
    certificate_digest: 4f3643c78a62485b99604cf78a87edbb1129985b4f2a675896dffd1d30346676
    claim_bindings:
      - claim_key: CLAIM-D5BAED30A693179C
        requirement_id: REQ-tree-sitter-language-set
        fact_id: FACT-tree-sitter-rust-extensions
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - .rs
---
Proves that a Rust source file shall end in .rs, against the code Kibi reads at ingest.