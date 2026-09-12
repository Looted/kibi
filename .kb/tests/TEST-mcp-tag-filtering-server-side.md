---
id: TEST-mcp-tag-filtering-server-side
title: Tag-filtered kb_query matches any provided tag
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/cli/tests/operations/discovery.test.ts
tags:
  - mcp
  - query
  - tags
  - unit
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-mcp-tag-filtering-server-side
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-46b2231ea4eeacd8b38d354b
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: failed
    code_snapshot: 71b43ef38f0945d5febd8dad9a12223a2f13e5092564f8222974a6fb48fc1ea5
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T06:30:49.943Z'
    finished_at: '2026-09-06T07:22:27.216Z'
    artifact_digest: 874dd5c6d454cff93bdf784b60380ee2fa22f4058f4382076d931c84dde61ccd
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-packed-dependency-ordered-repair-plan (failed), SYM-e2e-packed-cli-github-report (failed), SYM-test-core-journaled-engine-delta-sync (failed), SYM-test-opencode-bootstrap-paths (failed), SYM-codex-packed-plugin-e2e (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-72afae400827aaa9fc537e29
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 9648b885459e3a707873828ffc71810a3f3087e64d820acb1e5c20c4d424ee78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T08:03:27.689Z'
    finished_at: '2026-09-06T08:53:08.385Z'
    artifact_digest: a9446e6bf639a8313722c309e3e6a6bf674e647b465bc9a1f94f58e2956e82a6
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bbceb88d4e58c3de02f7cdeb
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 7a4310b9bccfd5ad2dc5dee7081fe78f9a64ccd5e179422b91542bb71e857382
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T09:14:02.169Z'
    finished_at: '2026-09-06T09:59:05.533Z'
    artifact_digest: 9700ae4ded2511c37e52dea96afb2ea71ea74ee07cd3bfef21fcf341d6714563
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dd293044cd0a60dea35d2b0c
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 877cc6202786943ab48c6e5914d1be7d4635e7e4450368b7cbb1cfbd537aeded
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T10:13:05.534Z'
    finished_at: '2026-09-06T11:02:05.222Z'
    artifact_digest: 3da3eeee7d1f0f1eba5c4f27b12c053492661a41debcb4cc9944e6b22926a852
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8c40e031aebfa93519ba5f38
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 15d2df13c1aeebc7302d91ab2a445d19802b0196958c8f17233b6c8844125d1d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T10:27:52.302Z'
    finished_at: '2026-09-08T11:19:24.843Z'
    artifact_digest: 3091125a96f8af53d17af9fc1a0360c82fd3fc05d382983186f3630f4ac591b9
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ff9415ee84b883cea7f165de
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: failed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T11:33:22.904Z'
    finished_at: '2026-09-08T12:49:16.395Z'
    artifact_digest: 2530f959a42f3cfa57d657b0d37ca5b35e47c46afda172d202b7e47e98f2b4ce
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1da78c81cc129037f6a70218
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T22:25:21.260Z'
    finished_at: '2026-09-08T23:59:14.030Z'
    artifact_digest: 5e672ca9a5db1ab9542e79720f36a07a82650e12bd2d2a4066af2d1f8bdeb09e
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1759bf29b6db5386a123d7ed
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: failed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T00:13:05.070Z'
    finished_at: '2026-09-09T01:03:10.098Z'
    artifact_digest: bad89c9316ec0948292d39d63faffe1fdf072c400c78d70d8b9e1a69dcd2f4c0
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e773c83386f87efd84967b45
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T01:13:47.891Z'
    finished_at: '2026-09-09T01:14:54.364Z'
    artifact_digest: bd383f5d42a596d8873ee3d1fb0df8d141e56667611e5f80ce131386a52fa1c8
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dd86e91587c076dcff046c2e
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T01:18:18.386Z'
    finished_at: '2026-09-09T02:07:31.793Z'
    artifact_digest: f70be05eaa4900406e5d2ab89e25e438aa7addb3864b239f923e8ac6f7cac34b
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0b785eab01f937d64aae0328
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 1955583b07a497b4ba3947edc2325838963105f1b93eebb7989c35f9d9976ca5
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T02:29:08.409Z'
    finished_at: '2026-09-09T03:17:04.010Z'
    artifact_digest: 0d941f4678ef7cf87c2ac37adb34ade41184a92a42472615745fe05781aa7151
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-183f913930cf07036dd31654
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 73304a19a83bfbaca3e3d0e52a7b97d454de2c753b8405c2eda73ca29bbef16c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T04:59:46.377Z'
    finished_at: '2026-09-09T05:44:19.775Z'
    artifact_digest: 50031ad292386cf2c587290d2bf043370abe66901e46814bcbe103fa994f6f7e
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e88e03b9e54aabd46be2a9cd
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 558de15f49a44612ab5506fd412ea2e1c0d774b8f8745243c0df15bb012d3ba2
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T06:05:52.608Z'
    finished_at: '2026-09-09T06:50:18.571Z'
    artifact_digest: 4f935be4b3d114a7b897b05094252c069c971d14ef24fb3e406f99f0683792b3
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a5b197303a62423d46e6896f
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: failed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T07:39:42.865Z'
    finished_at: '2026-09-09T08:30:39.011Z'
    artifact_digest: 133420075f0adea4c311c3138f41d8ee31c6f8e7bd30355041389b5d200224ae
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-core-adr-supersession (failed), SYM-test-core-journaled-engine-persistence (failed), SYM-e2e-test-agent-guided-migration-orchestration (failed), SYM-e2e-test-kibi-logical-requirement-coverage (failed), SYM-test-packed-fresh-verification-receipts (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-554feac41aca50d07237a351
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T08:39:23.385Z'
    finished_at: '2026-09-09T09:23:52.214Z'
    artifact_digest: 205a84ca07cf48423f589304f5887175724238701dc00650fc5e5c6acaf165c1
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d22f95e69a5fc39c13452a91
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 88f7db573953eb069d10f6e92c42d41ff7b777c025efedbc8c087901bdf86f70
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T09:37:57.606Z'
    finished_at: '2026-09-09T10:22:19.843Z'
    artifact_digest: d113351a4cc8ce4d655ad86ddf8339c9a390ad00ed397e90eb41a0a9c494c287
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-afe89db9a889162b055350d3
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 79ff0d34362721426b024912cd0b299cb0a72531a626020d29837330b1ec6434
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-09T23:33:23.834Z'
    finished_at: '2026-09-10T00:22:01.917Z'
    artifact_digest: 4f4ad525ec33f63a0645a9fe17519fe95eef71efc4eeda86cba43334e730afcd
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Asserts that `kb_query` with a `tags` filter keeps any-of matching semantics and applies the filter before pagination. Executable coverage spans `packages/cli/tests/operations/discovery.test.ts` and `packages/mcp/tests/tools/query.test.ts`.
