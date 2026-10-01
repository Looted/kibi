---
title: Installed staged-impact timing observations remain bounded and fail closed
status: active
text_ref: scripts/benchmark-installed-staged-impact.test.mjs
tags:
  - multilingual
  - benchmark
  - timing-integrity
  - installed-consumer
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-installed-staged-impact-timing-integrity
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-installed-impact-runWorkflow
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cb8a487b952ad8e5dedd51ff
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-038e0d6071180b349d5bab36
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6864a21293b3daf5e954678d
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7da510bab75c5ee81438b762
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bde2edab37993c335afb174b
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e301e03fdafb06caefd32b93
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b108d328d128da6cbd14a729
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-198f8c6f469ede7793137c60
    test_id: TEST-installed-staged-impact-timing-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: 08c571a1159e02fceab7228e3e5602a4a4b3640c8cd9b07b52695408433f3d2c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T20:55:45.152Z'
    finished_at: '2026-09-30T21:39:09.186Z'
    artifact_digest: 1231ed5f54da37e9f82308adb82a0e2dffcd3ea781f5ccd044c5307ff8b49f96
    contract_hash: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
    binding_hash: 463ccb4254ee256f3dd21b3886f2defc23e6d32b7789ef60728eab93bc42e936
    fingerprint: c133990437a3498ce4683b23bc5376213d584336ea2c1fbef7f71e7f9986deb2
    fingerprint_components:
      contract: 3b60b75b5abcf1b6a7d461075de49a903ba7d2d3cb252829b4cbd6b3be3760b5
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
      - symbol_id: SYM-installed-impact-runWorkflow
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
