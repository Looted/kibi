---
title: Tree-sitter grammar packs are verified, refused when missing or modified, and named by kibi doctor
status: passing
tags:
  - plugin
  - multilingual
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-31T17:56:17.578Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-tree-sitter-source-references
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-tree-sitter-language-packs
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e578993d22df757cc025041e
    test_id: TEST-kibi-tree-sitter-language-packs
    scope: end_to_end
    outcome: passed
    code_snapshot: 56f071d3e3a8127d60bb22f68db0f2fe2dd62477e75c753814bfb03207a78e18
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T19:04:15.113Z'
    finished_at: '2026-10-31T19:04:42.285Z'
    artifact_digest: 1546eef633ae20cc3ee7dec34b3b32aa07c842cb844dc0f92a3d824e5d88f677
    contract_hash: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
    binding_hash: ef205347ab2f497243f658d85c1279ae61f9d93ee35dafe233f745f08e3c84fc
    fingerprint: d1bb1844a5f3b21915897be3766b565cb2aee442c7187e0b9bedb74ac5afbc67
    fingerprint_components:
      contract: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
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
      - symbol_id: SYM-e2e-packed-tree-sitter-source-references
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packs the CLI, kibi-plugin-treesitter and the kibi-lang grammar packs, installs the plugin into a polyglot service without packs and checks that a Go reference read is refused naming kibi-lang-go and that kibi doctor names kibi-lang-go at the pinned version; after installing the Go, Java, C# and Rust packs the reads are proved. packages/cli/tests/plugins/approved-source-consumer.test.ts runs a relocated approved plugin through the maintenance host: Go and Python without their packs are unsupported with the install line, and a Rust pack with one changed byte fails with TREESITTER_LANGUAGE_PACK_MISMATCH. packages/cli/tests/plugins/language-pack-suggestion.test.ts checks which packs doctor and init name and that the CLI pack table matches the plugin catalog.