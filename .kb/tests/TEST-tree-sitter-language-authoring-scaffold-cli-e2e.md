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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a8edb3e16d84d55ff56c8b7c
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: b8ff107847894ccacd45da0bbde230be4997e2b2e9c770ad7698b7cb45ad7a13
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
    receipt_id: PR-e6fafbe4f685b74813c9f5c9
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: b8ff107847894ccacd45da0bbde230be4997e2b2e9c770ad7698b7cb45ad7a13
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
    receipt_id: PR-8f0c1e60c7c2f36c079be24c
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: b8ff107847894ccacd45da0bbde230be4997e2b2e9c770ad7698b7cb45ad7a13
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-tree-sitter-language-scaffold-draft-output
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a7b9e445181b37ed64acf867
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: b8ff107847894ccacd45da0bbde230be4997e2b2e9c770ad7698b7cb45ad7a13
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
    receipt_id: PR-08db35eb12133e2005999d87
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: b8ff107847894ccacd45da0bbde230be4997e2b2e9c770ad7698b7cb45ad7a13
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
    receipt_id: PR-009ea612e8f37341968ac874
    test_id: TEST-tree-sitter-language-authoring-scaffold-cli-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 08c571a1159e02fceab7228e3e5602a4a4b3640c8cd9b07b52695408433f3d2c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T20:55:45.152Z'
    finished_at: '2026-09-30T21:39:09.186Z'
    artifact_digest: 1231ed5f54da37e9f82308adb82a0e2dffcd3ea781f5ccd044c5307ff8b49f96
    contract_hash: d8493fae13afc1ee41a4d099883b25fc44f2acbce39b2f9b66acac0de875e980
    binding_hash: b8ff107847894ccacd45da0bbde230be4997e2b2e9c770ad7698b7cb45ad7a13
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
