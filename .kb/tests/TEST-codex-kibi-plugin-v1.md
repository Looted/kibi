---
id: TEST-codex-kibi-plugin-v1
title: Codex Kibi Plugin v1 Verification
status: active
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
priority: must
tags:
  - test
  - kibi
  - codex
  - plugin
  - verification
links:
  - type: validates
    target: SCEN-codex-kibi-plugin-v1
  - type: relates_to
    target: REQ-codex-kibi-plugin-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5ab76de400efa1185ed400ff
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 71b43ef38f0945d5febd8dad9a12223a2f13e5092564f8222974a6fb48fc1ea5
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T06:30:49.943Z'
    finished_at: '2026-09-06T07:22:27.216Z'
    artifact_digest: 874dd5c6d454cff93bdf784b60380ee2fa22f4058f4382076d931c84dde61ccd
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-packed-dependency-ordered-repair-plan (failed), SYM-e2e-packed-cli-github-report (failed), SYM-test-core-journaled-engine-delta-sync (failed), SYM-test-opencode-bootstrap-paths (failed), SYM-codex-packed-plugin-e2e (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f40d1ec6c02265e1da8f192a
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9648b885459e3a707873828ffc71810a3f3087e64d820acb1e5c20c4d424ee78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T08:03:27.689Z'
    finished_at: '2026-09-06T08:53:08.385Z'
    artifact_digest: a9446e6bf639a8313722c309e3e6a6bf674e647b465bc9a1f94f58e2956e82a6
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b4f3495366b5e17ff5982eb0
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7a4310b9bccfd5ad2dc5dee7081fe78f9a64ccd5e179422b91542bb71e857382
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T09:14:02.169Z'
    finished_at: '2026-09-06T09:59:05.533Z'
    artifact_digest: 9700ae4ded2511c37e52dea96afb2ea71ea74ee07cd3bfef21fcf341d6714563
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fd4f07690b0ac28270ba3449
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 877cc6202786943ab48c6e5914d1be7d4635e7e4450368b7cbb1cfbd537aeded
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T10:13:05.534Z'
    finished_at: '2026-09-06T11:02:05.222Z'
    artifact_digest: 3da3eeee7d1f0f1eba5c4f27b12c053492661a41debcb4cc9944e6b22926a852
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-570b9fae50ed5a17a82c0706
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 15d2df13c1aeebc7302d91ab2a445d19802b0196958c8f17233b6c8844125d1d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T10:27:52.302Z'
    finished_at: '2026-09-08T11:19:24.843Z'
    artifact_digest: 3091125a96f8af53d17af9fc1a0360c82fd3fc05d382983186f3630f4ac591b9
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-49cf0105d9cf3b532f7778d6
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T11:33:22.904Z'
    finished_at: '2026-09-08T12:49:16.395Z'
    artifact_digest: 2530f959a42f3cfa57d657b0d37ca5b35e47c46afda172d202b7e47e98f2b4ce
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2ae92de11acf7a4d3bcf4feb
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T22:25:21.260Z'
    finished_at: '2026-09-08T23:59:14.030Z'
    artifact_digest: 5e672ca9a5db1ab9542e79720f36a07a82650e12bd2d2a4066af2d1f8bdeb09e
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c032408cbe53309dfd12ed08
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T00:13:05.070Z'
    finished_at: '2026-09-09T01:03:10.098Z'
    artifact_digest: bad89c9316ec0948292d39d63faffe1fdf072c400c78d70d8b9e1a69dcd2f4c0
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f2d9d3becbd84281c0671229
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T00:26:21.288Z'
    finished_at: '2026-09-09T01:15:54.286Z'
    artifact_digest: 1f819455f4121f45eac006de275ea80d45932ed3f5358481e2c065cf2db25d4d
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cc23125028ea1d08284a42c1
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T01:18:18.386Z'
    finished_at: '2026-09-09T02:07:31.793Z'
    artifact_digest: f70be05eaa4900406e5d2ab89e25e438aa7addb3864b239f923e8ac6f7cac34b
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e8a37f341d4b22550a88a1e5
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1955583b07a497b4ba3947edc2325838963105f1b93eebb7989c35f9d9976ca5
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T02:29:08.409Z'
    finished_at: '2026-09-09T03:17:04.010Z'
    artifact_digest: 0d941f4678ef7cf87c2ac37adb34ade41184a92a42472615745fe05781aa7151
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f81acc587fa6e5f467851dec
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 73304a19a83bfbaca3e3d0e52a7b97d454de2c753b8405c2eda73ca29bbef16c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T04:59:46.377Z'
    finished_at: '2026-09-09T05:44:19.775Z'
    artifact_digest: 50031ad292386cf2c587290d2bf043370abe66901e46814bcbe103fa994f6f7e
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-371f7bd54ea7bce69cedcb96
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 558de15f49a44612ab5506fd412ea2e1c0d774b8f8745243c0df15bb012d3ba2
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T06:05:52.608Z'
    finished_at: '2026-09-09T06:50:18.571Z'
    artifact_digest: 4f935be4b3d114a7b897b05094252c069c971d14ef24fb3e406f99f0683792b3
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3a23adcfe1dd2dcd743b69fe
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T07:39:42.865Z'
    finished_at: '2026-09-09T08:30:39.011Z'
    artifact_digest: 133420075f0adea4c311c3138f41d8ee31c6f8e7bd30355041389b5d200224ae
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-core-adr-supersession (failed), SYM-test-core-journaled-engine-persistence (failed), SYM-e2e-test-agent-guided-migration-orchestration (failed), SYM-e2e-test-kibi-logical-requirement-coverage (failed), SYM-test-packed-fresh-verification-receipts (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-93035eec9a0220fb1c504ec0
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T08:39:23.385Z'
    finished_at: '2026-09-09T09:23:52.214Z'
    artifact_digest: 205a84ca07cf48423f589304f5887175724238701dc00650fc5e5c6acaf165c1
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-10dc815c22cb1a28c1998a2a
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 88f7db573953eb069d10f6e92c42d41ff7b777c025efedbc8c087901bdf86f70
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T09:37:57.606Z'
    finished_at: '2026-09-09T10:22:19.843Z'
    artifact_digest: d113351a4cc8ce4d655ad86ddf8339c9a390ad00ed397e90eb41a0a9c494c287
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b3e8d724ec807ddaf123c899
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 79ff0d34362721426b024912cd0b299cb0a72531a626020d29837330b1ec6434
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-09T23:33:23.834Z'
    finished_at: '2026-09-10T00:22:01.917Z'
    artifact_digest: 4f4ad525ec33f63a0645a9fe17519fe95eef71efc4eeda86cba43334e730afcd
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8e05d63dce6f7839595a77a9
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 79f838abae86001aa78ba97d7be9f63467709effbd55b97118f9a0ccef937803
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-12T00:53:36.381Z'
    finished_at: '2026-09-12T02:23:02.095Z'
    artifact_digest: 729ba6000636c5b9faca47c20a964ecb8e3b5ed9f9a1c753d181e5febbb50b8c
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-09aa749ee1371b3234378145
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 609b27d4e5672c4000011b090499931e6a1fe38be1981e2088de3e3e4fb2f277
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T20:17:13.278Z'
    finished_at: '2026-09-13T21:56:21.890Z'
    artifact_digest: c976524424d5b291f4e58e762a7e0fe0a5f0e09d457a6213cfaaa0195a072de4
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d5f3caf3bab5cc1cf23f39d2
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 0b5814a1764ceb7e33a105329bcfac1ca4ab366405f4083d213938472376fb44
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T22:14:34.497Z'
    finished_at: '2026-09-13T23:51:44.048Z'
    artifact_digest: f22bd2804415e7b28c082cc4e0491f9cc5b9947a5bb0b6aa76bd06e39712bf82
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8bb9597ded74fdec21ae97b8
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 32fc8076ce1ce9656d665c040aae2f438b4d47e12d23ad67c7e2396871cdb96b
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T04:53:57.354Z'
    finished_at: '2026-09-14T06:13:26.255Z'
    artifact_digest: 738ce45f97ae1097eadd640367ac094351b9f6ecf2c331c84e56b71e495f7f77
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b8f58db462f711787c4e06ce
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ed40ba5e905305e0049ad3548381193ed09b7a4c16602e2deb3c109eb7acda13
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T06:29:52.699Z'
    finished_at: '2026-09-14T07:37:41.045Z'
    artifact_digest: 9e21e6884d6f07025a28d1aff21db0b67358a05dc6a0cc0df2654eaacf06dcfb
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-57853ddc52c7afa798676b37
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 807961781c537e824f0bd98a27b157fdb699f858cd39d2bd42acef64a5f2222a
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T13:11:45.423Z'
    finished_at: '2026-09-14T13:37:56.113Z'
    artifact_digest: fadc0c61f917b435961101344a5a47a8790fd55e5b9d0f389a413cce82a57531
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0692fe27e469a1874a4fe02a
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c613c587e4ca4b7b68ef60af5587603c701a24922708732b2e3202cfd1e44c62
    environment_hash: 099f7c7810817359ceb53f590959a4934481728356256c4ad8d76cebc5094929
    started_at: '2026-09-15T03:23:50.237Z'
    finished_at: '2026-09-15T03:55:17.162Z'
    artifact_digest: ec6b0a857165cc564b40009d6e1f29fdaa822402c84a5f3b4b67b11b265d8826
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-aff4dc3d420dd4961f670ef7
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: a4e7bee0eccf1ef30deb244bf5e02822ca9e2a1be722875afeca276af1d00111
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T13:38:13.291Z'
    finished_at: '2026-09-17T14:08:43.421Z'
    artifact_digest: 4b46bd7e42bc97e7e45ccb151d3a1ad8ccea0423f2db0cc425f71995ffa9e3ef
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5f1cccbb8dd000b2508520ca
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1972508a4652f82750d93bee293666961045af7bcdd157c91e02647eb24ecfdd
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T14:29:34.065Z'
    finished_at: '2026-09-17T15:00:23.481Z'
    artifact_digest: accb6c6e18f474a89e4bbe8c043408988ae33c7c519bba0b407911c115668680
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1936b121d8739dbfbc8a9444
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 59396fc4de3f764873a8a552bcced7d61f442f84fa3bf0465ec0c7a0913a4e88
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T17:26:27.052Z'
    finished_at: '2026-09-17T18:09:58.071Z'
    artifact_digest: 444bb68a2c1abf8fec72ed6f4d7706c83ea382ef4d27c447919af7b99a789681
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1c732692ba7043730592a659
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 82583d2845302db2951548815aeeb65ec8245210e1b3f35f9871222b58ba20bb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T19:55:25.617Z'
    finished_at: '2026-09-17T20:35:57.777Z'
    artifact_digest: 4ba7b11bc867e8ae48adccd54eaa298232996cee139ad0caf04b3fc19341fa55
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d0ebaa25b3f9c1553a844500
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6889433e9c87f2ed487e273c
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7dce1afe0fdd43aa1d0e4feea031d222163ed053450d755795c7e5b9b1b332b5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T11:08:18.939Z'
    finished_at: '2026-09-18T11:31:55.494Z'
    artifact_digest: 1305c15266e3c7a81377bac6480bd3ebd0eb54580efdb96dd5a10302f76039f2
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e1327270eae508d50b147a7e
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 4e31a4f3f9a7d558b279464f3a64ecfb0c232341508e60b9bdec7021c792e7cc
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3252b370ebd1690e011784aa
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-04db7c9a72d905d6ca5da2e9
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-33d30b8462e82fd32900a665
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b211fc4c7cfb01fceff625b0
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d72897599665779b3dc4166f
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b847b930a350b924cc3fd2dc
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ed759694c2de10f2ebb55372
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-28fc3a6030db3af1e4ef2ada
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9d6b1a2776e58b7b9f37791f
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c95b0ae4cf70c0336cada04c
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-67f6257f3ea5635c7e706cbc
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6481582ef10a86b71f4d272f
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5bcd42bbc80d0636ee6db0d4
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-736a3c5de49dc31d9bba839e
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-72bd21ddeefe6ef6a5909593
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2ee2f78a59ecbcb9422f6fbf
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 17d26c6bf27a3e5fa42113f021bf2b250140851aea8a51dcb29e71ea85465ffc
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:09:39.572Z'
    finished_at: '2026-09-26T11:26:46.912Z'
    artifact_digest: 5e15c583ed601b53256856b0f62aa348fec3a03cc76f327007241136eff85214
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c210c9a9e2cdece20ab61f3b
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a20108970eddbe026c332f8f0fef6001fa956bf246b5dee956c8c7586f878071
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:43:16.296Z'
    finished_at: '2026-09-26T11:59:41.121Z'
    artifact_digest: b458ebe1ef850179dd754bc08eb0a62bb0e46b7bbf068e00bb4230915cc296ed
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-96eb0c8efdfa2bdcea885064
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: de201a2dd0c317058bd0fb2437de496eaadfbdd3e21c3fd432d77169cc672e2e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T12:51:30.031Z'
    finished_at: '2026-09-26T13:07:42.195Z'
    artifact_digest: c9cece4a6c8412af4af92cf82807f3850d2b801045aacf7d48830d68278a660f
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: a9b4e04980bfdceadca5575515a3af1f3db21543f48d4087b9ae957064f6b15e
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Verification for `kibi-codex` documentation and plugin onboarding guidance includes:

- Ensure `packages/codex/.codex-plugin/plugin.json` exports plugin manifest paths and MCP config for the project-local `kibi-mcp` server.
- Ensure `.agents/plugins/marketplace.json` exposes `kibi-codex` from `./packages/codex` for repo-scoped Codex marketplace installs.
- Ensure installation guidance in `README.md` and `docs/install.md` states `kibi-codex` is optional and keeps `kibi-core`, `kibi-cli`, and `kibi-mcp` as foundational runtime dependencies.
- Ensure installation guidance documents `codex plugin marketplace add Looted/kibi` and explains that official OpenAI Plugin Directory self-serve publishing is not yet available.
- Ensure the optional Codex plugin section documents hook bundle behavior, required plugin trust review, and fallback/manual MCP configuration.
- Ensure `docs/architecture.md` models the Codex plugin as an adapter layer that connects to MCP/Kibi rather than replacing storage or core CLI behavior.
- Ensure no documentation claims official marketplace acceptance as already complete.
