---
title: Tree-sitter language scaffold emits disconnected unqualified draft output
status: passing
text_ref: scripts/tests/scaffold-tree-sitter-language.test.mjs
tags:
  - multilingual
  - tree-sitter
  - language-authoring
  - scaffold
verification_scope: unit
verification_perspective: internal
id: TEST-tree-sitter-language-authoring-scaffold-draft-output
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3dcbc6481f8314356b0fe341
    test_id: TEST-tree-sitter-language-authoring-scaffold-draft-output
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: 4cea21943cc58e08a9ae7b33754afca02ebccce588c6a039c29542d029ed9c14
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
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This checks that the scaffold's output is a disconnected, unqualified draft.
