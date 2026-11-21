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
    receipt_id: PR-1dc00da752961d6ccff360cc
    test_id: TEST-kibi-tree-sitter-language-packs
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
    binding_hash: 18c493c6613da13fb31097ebeac4bf9c69f90a6713511cc98729cee874a16289
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
Packs the CLI, kibi-plugin-treesitter and the kibi-lang grammar packs, installs the plugin into a polyglot service without packs and checks that a Go reference read is refused naming kibi-lang-go and that kibi doctor names kibi-lang-go at the pinned version; after installing the Go, Java, C# and Rust packs the reads are proved. packages/cli/tests/plugins/approved-source-consumer.test.ts runs a relocated approved plugin through the maintenance host: Go and Python without their packs are unsupported with the install line, and a Rust pack with one changed byte fails with TREESITTER_LANGUAGE_PACK_MISMATCH. packages/cli/tests/plugins/language-pack-suggestion.test.ts checks which packs doctor and init name and that the CLI pack table matches the plugin catalog. packages/cli/tests/plugins/language-pack-relevance.test.ts checks, in a generated grammar repository, that generated files count toward a pack only when the KB names them, that declined packs are never suggested, that a declined or generated file without its pack gets a whole-file review while a hand-written one still blocks, and that a commit cannot decline the pack of the source it changes. packages/cli/tests/commands/check-staged-generated.test.ts runs kibi check --staged in a fresh repository: symbols of a file that the committed .gitattributes, kibi.generatedPaths or the committed generator header marks generated need no requirement link, a negated pattern and a mark added in the same change keep the check, and a generated file .kb/symbols.yaml names stays fully checked.