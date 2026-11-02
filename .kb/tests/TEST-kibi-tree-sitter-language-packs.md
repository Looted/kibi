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
    receipt_id: PR-e2f41cdacd3824f7be47804e
    test_id: TEST-kibi-tree-sitter-language-packs
    scope: end_to_end
    outcome: passed
    code_snapshot: 5a64251baef7f0eb50887c917b6171f24fcd63613864fed40f24aa88e5b56a96
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-02T11:59:29.258Z'
    finished_at: '2026-11-02T12:01:27.430Z'
    artifact_digest: ec5d724ff8d46145de6980bc5a496ff0bd04954fdba3e9a9ad07a3d17f98a8fa
    contract_hash: 666c46c3735bda5801924dbcc821974cfd32b70f230ed17b3aa333dc8a057bcf
    binding_hash: aece02a71d2f12bd35d796e95af4384ac9ff0dd3f27b678da3341c02afa15b4f
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