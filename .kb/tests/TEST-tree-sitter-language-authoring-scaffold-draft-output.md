---
title: Tree-sitter language scaffold emits disconnected unqualified draft output
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-186038ccce4202f44f80594c
    test_id: TEST-tree-sitter-language-authoring-scaffold-draft-output
    scope: unit
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: f04445871b8888db9afcc64515c76364e8ae18eeef0ccfef3d4cc2f021679161
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-14112f00efda6098dcf1dfd3
    test_id: TEST-tree-sitter-language-authoring-scaffold-draft-output
    scope: unit
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: 88582db19904d941b03de5ef86f7794af9a9c11fc2859cf30f55d93475bce681
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ecc777763fee6623bd2b776a
    test_id: TEST-tree-sitter-language-authoring-scaffold-draft-output
    scope: unit
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: 88582db19904d941b03de5ef86f7794af9a9c11fc2859cf30f55d93475bce681
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
---
