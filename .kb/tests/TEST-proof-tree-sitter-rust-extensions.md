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
    receipt_id: PR-e48bb6655ddfc1f91c415a5d
    test_id: TEST-proof-tree-sitter-rust-extensions
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ff5b194f6a7b64529a4127974d490f325fa2375046010067afa959cf00629a63
    binding_hash: 725b4aee3e7626f5267de59359bfe06da207437f39f15b86fbbd40212740e349
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