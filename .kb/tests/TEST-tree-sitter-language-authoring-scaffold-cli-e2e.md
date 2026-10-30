---
title: Scaffold CLI creates a draft without modifying live language support
status: active
text_ref: scripts/tests/scaffold-tree-sitter-language.test.mjs
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - multilingual
  - tree-sitter
  - language-authoring
  - scaffold
  - e2e
  - review:context-missing
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
      target: default
  success_policy: all_required_first_attempt
id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7e5fdce6526e37f101a51c60
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: afb3cdbea213e763f387c3323e2e66996394012a39dd7d3623545ab9b3cd5977
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:42:44.276Z'
    finished_at: '2026-10-28T22:42:44.671Z'
    artifact_digest: 1b1ce7380624c2e9e4f55e25942b6c80d28fe69ecad8cd916faebab313158f8a
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: 099c6700e4698038c7058cbf21a8056fc28f2e4880add16603a8aa6a89349f5d
    fingerprint: 24107bce074e90e7c0883b3904cfdbb682a9a8d71d9b9cf375940a93958a51a0
    fingerprint_components:
      contract: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
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
      - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
