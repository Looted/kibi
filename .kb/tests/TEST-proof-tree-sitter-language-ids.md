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
    receipt_id: PR-faedcbaa3f2416ab3386182c
    test_id: TEST-proof-tree-sitter-language-ids
    scope: unit
    outcome: passed
    code_snapshot: afb3cdbea213e763f387c3323e2e66996394012a39dd7d3623545ab9b3cd5977
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:42:49.742Z'
    finished_at: '2026-10-28T22:42:49.835Z'
    artifact_digest: ae62c2500583a7a763c814d406370c889597a323e7bc86848fa6d888adae420a
    contract_hash: 03ce6d8d6e6b4933e4210407d037dff30201a73beaecc2231f4fce972db558b7
    binding_hash: fe33f4cf4560de11962de8db24f5f1a2704ccdf785544930af822e4f2ca55c49
    fingerprint: 4188b34c844b0e1bab3f0384c4c1bda6cba9e82f55a5c742343a80a43f9db5db
    fingerprint_components:
      contract: 03ce6d8d6e6b4933e4210407d037dff30201a73beaecc2231f4fce972db558b7
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
    certificate_digest: 30e54596ef24d5cf9c76c2935fe54233dc359c2f658d77175f36fcee3d0e4798
    claim_bindings:
      - claim_key: CLAIM-792D57510F335E69
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
            - python
            - ruby
            - rust
            - terraform
---
Proves that a tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl, against the code Kibi reads at ingest.