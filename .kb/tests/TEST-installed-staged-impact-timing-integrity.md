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
---
