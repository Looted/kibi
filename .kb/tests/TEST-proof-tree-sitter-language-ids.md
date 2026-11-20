---
title: A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, prolog, terraform or hcl, by an exhaustive proof
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
    - symbol_id: SYM-proof-tree-sitter-language-ids
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
  proves:
    - CLAIM-65D3E23B3522B092
origin:
  kind: agent
  recorded_at: '2026-10-28T22:41:44.658Z'
id: TEST-proof-tree-sitter-language-ids
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-eff437e436bc4fb25dfe9c70
    test_id: TEST-proof-tree-sitter-language-ids
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 781772c3b0062f14b364bfb7df0d8f4f233de9797700393de9f41ed4c349e777
    binding_hash: bcd6ed4ec3636f1b596b4b8e3e1cb0f7c2c69bb5a7d4f7228557ded6cd261a25
    fingerprint: c7e4555534904457fdf713a99dabff8efff86dadaf4017c3dba51b25715f57fd
    fingerprint_components:
      contract: 781772c3b0062f14b364bfb7df0d8f4f233de9797700393de9f41ed4c349e777
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
      - symbol_id: SYM-proof-tree-sitter-language-ids
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
      test_id: TEST-proof-tree-sitter-language-ids
      domain:
        symbol_id: SYM-source-analysis-v2-tree-sitter-languages-dae6879e
        members:
          - python
          - go
          - rust
          - java
          - csharp
          - php
          - c
          - cpp
          - bash
          - ruby
          - terraform
          - hcl
          - prolog
      results:
        - member: python
          outcome: passed
        - member: go
          outcome: passed
        - member: rust
          outcome: passed
        - member: java
          outcome: passed
        - member: csharp
          outcome: passed
        - member: php
          outcome: passed
        - member: c
          outcome: passed
        - member: cpp
          outcome: passed
        - member: bash
          outcome: passed
        - member: ruby
          outcome: passed
        - member: terraform
          outcome: passed
        - member: hcl
          outcome: passed
        - member: prolog
          outcome: passed
    certificate_digest: c26d397b2ca05a60e50ced2af5df73fc35efd12cbcba5f8d75797f814e0aa44c
    claim_bindings:
      - claim_key: CLAIM-65D3E23B3522B092
        requirement_id: REQ-tree-sitter-language-set
        fact_id: FACT-tree-sitter-language-ids
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - bash
            - c
            - cpp
            - csharp
            - go
            - hcl
            - java
            - php
            - prolog
            - python
            - ruby
            - rust
            - terraform
---
Proves that a tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl, against the code Kibi reads at ingest.