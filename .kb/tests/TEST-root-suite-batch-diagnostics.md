---
id: TEST-root-suite-batch-diagnostics
title: Batch timeout and failure diagnostics in root test suite
status: active
created_at: 2026-07-27T10:00:00.000Z
updated_at: 2026-07-27T10:00:00.000Z
priority: must
tags:
  - testing
  - diagnostics
  - root-suite
  - unit
links:
  - type: validates
    target: REQ-root-suite-batch-diagnostics
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8d6bde7c3ce4c52a73fc2a66
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 93f5f0dec46e04618b4c7514f75527317c006ff103eb250884af156e885de263
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-08T22:25:21.260Z'
    finished_at: '2026-09-08T23:59:14.030Z'
    artifact_digest: 5e672ca9a5db1ab9542e79720f36a07a82650e12bd2d2a4066af2d1f8bdeb09e
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5b256f1da04b0d033dcf37ff
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T00:13:05.070Z'
    finished_at: '2026-09-09T01:03:10.098Z'
    artifact_digest: bad89c9316ec0948292d39d63faffe1fdf072c400c78d70d8b9e1a69dcd2f4c0
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1377c542b30d93fc038380cd
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: d00857167c57e585e0e777f8327ebab4598b8158ff6e0b72d2488ce7fed4cedb
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T01:18:18.386Z'
    finished_at: '2026-09-09T02:07:31.793Z'
    artifact_digest: f70be05eaa4900406e5d2ab89e25e438aa7addb3864b239f923e8ac6f7cac34b
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8a66a33b9872908fb9fb5917
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 1955583b07a497b4ba3947edc2325838963105f1b93eebb7989c35f9d9976ca5
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T02:29:08.409Z'
    finished_at: '2026-09-09T03:17:04.010Z'
    artifact_digest: 0d941f4678ef7cf87c2ac37adb34ade41184a92a42472615745fe05781aa7151
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-22a495586f638e1852bc5486
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 73304a19a83bfbaca3e3d0e52a7b97d454de2c753b8405c2eda73ca29bbef16c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T04:59:46.377Z'
    finished_at: '2026-09-09T05:44:19.775Z'
    artifact_digest: 50031ad292386cf2c587290d2bf043370abe66901e46814bcbe103fa994f6f7e
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0c071717d81fe2391a1d08d8
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 558de15f49a44612ab5506fd412ea2e1c0d774b8f8745243c0df15bb012d3ba2
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T06:05:52.608Z'
    finished_at: '2026-09-09T06:50:18.571Z'
    artifact_digest: 4f935be4b3d114a7b897b05094252c069c971d14ef24fb3e406f99f0683792b3
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7cb79f1e5479abd7bf094944
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T07:39:42.865Z'
    finished_at: '2026-09-09T08:30:39.011Z'
    artifact_digest: 133420075f0adea4c311c3138f41d8ee31c6f8e7bd30355041389b5d200224ae
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-core-adr-supersession (failed), SYM-test-core-journaled-engine-persistence (failed), SYM-e2e-test-agent-guided-migration-orchestration (failed), SYM-e2e-test-kibi-logical-requirement-coverage (failed), SYM-test-packed-fresh-verification-receipts (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bdc273a2914ac6883b8ced93
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T08:39:23.385Z'
    finished_at: '2026-09-09T09:23:52.214Z'
    artifact_digest: 205a84ca07cf48423f589304f5887175724238701dc00650fc5e5c6acaf165c1
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c6740b2f211f9ea9469d46d1
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 88f7db573953eb069d10f6e92c42d41ff7b777c025efedbc8c087901bdf86f70
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T09:37:57.606Z'
    finished_at: '2026-09-09T10:22:19.843Z'
    artifact_digest: d113351a4cc8ce4d655ad86ddf8339c9a390ad00ed397e90eb41a0a9c494c287
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7c1f1e36f878a8b43e40a793
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 79ff0d34362721426b024912cd0b299cb0a72531a626020d29837330b1ec6434
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-09T23:33:23.834Z'
    finished_at: '2026-09-10T00:22:01.917Z'
    artifact_digest: 4f4ad525ec33f63a0645a9fe17519fe95eef71efc4eeda86cba43334e730afcd
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cf1f31222ef804cf0594870a
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 79f838abae86001aa78ba97d7be9f63467709effbd55b97118f9a0ccef937803
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-12T00:53:36.381Z'
    finished_at: '2026-09-12T02:23:02.095Z'
    artifact_digest: 729ba6000636c5b9faca47c20a964ecb8e3b5ed9f9a1c753d181e5febbb50b8c
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-492e3eee0645ced52959abc2
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 609b27d4e5672c4000011b090499931e6a1fe38be1981e2088de3e3e4fb2f277
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T20:17:13.278Z'
    finished_at: '2026-09-13T21:56:21.890Z'
    artifact_digest: c976524424d5b291f4e58e762a7e0fe0a5f0e09d457a6213cfaaa0195a072de4
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d29269897edff95bfa68bb91
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 0b5814a1764ceb7e33a105329bcfac1ca4ab366405f4083d213938472376fb44
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T22:14:34.497Z'
    finished_at: '2026-09-13T23:51:44.048Z'
    artifact_digest: f22bd2804415e7b28c082cc4e0491f9cc5b9947a5bb0b6aa76bd06e39712bf82
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4f3c756f2d907c41a45d91da
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 32fc8076ce1ce9656d665c040aae2f438b4d47e12d23ad67c7e2396871cdb96b
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T04:53:57.354Z'
    finished_at: '2026-09-14T06:13:26.255Z'
    artifact_digest: 738ce45f97ae1097eadd640367ac094351b9f6ecf2c331c84e56b71e495f7f77
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3020006f779823f114876abe
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: ed40ba5e905305e0049ad3548381193ed09b7a4c16602e2deb3c109eb7acda13
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T06:29:52.699Z'
    finished_at: '2026-09-14T07:37:41.045Z'
    artifact_digest: 9e21e6884d6f07025a28d1aff21db0b67358a05dc6a0cc0df2654eaacf06dcfb
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-07f466ca2f5e44372425c57e
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 807961781c537e824f0bd98a27b157fdb699f858cd39d2bd42acef64a5f2222a
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T13:11:45.423Z'
    finished_at: '2026-09-14T13:37:56.113Z'
    artifact_digest: fadc0c61f917b435961101344a5a47a8790fd55e5b9d0f389a413cce82a57531
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fd35710592b65934ef8cd74f
    test_id: TEST-root-suite-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: c613c587e4ca4b7b68ef60af5587603c701a24922708732b2e3202cfd1e44c62
    environment_hash: 099f7c7810817359ceb53f590959a4934481728356256c4ad8d76cebc5094929
    started_at: '2026-09-15T03:23:50.237Z'
    finished_at: '2026-09-15T03:55:17.162Z'
    artifact_digest: ec6b0a857165cc564b40009d6e1f29fdaa822402c84a5f3b4b67b11b265d8826
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5d7cde8b042a2407f9d7e0b7
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: a4e7bee0eccf1ef30deb244bf5e02822ca9e2a1be722875afeca276af1d00111
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T13:38:13.291Z'
    finished_at: '2026-09-17T14:08:43.421Z'
    artifact_digest: 4b46bd7e42bc97e7e45ccb151d3a1ad8ccea0423f2db0cc425f71995ffa9e3ef
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fba29b0796d3b38af11c40f4
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 1972508a4652f82750d93bee293666961045af7bcdd157c91e02647eb24ecfdd
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T14:29:34.065Z'
    finished_at: '2026-09-17T15:00:23.481Z'
    artifact_digest: accb6c6e18f474a89e4bbe8c043408988ae33c7c519bba0b407911c115668680
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-743faede64d249b0ad7fcf21
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 59396fc4de3f764873a8a552bcced7d61f442f84fa3bf0465ec0c7a0913a4e88
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T17:26:27.052Z'
    finished_at: '2026-09-17T18:09:58.071Z'
    artifact_digest: 444bb68a2c1abf8fec72ed6f4d7706c83ea382ef4d27c447919af7b99a789681
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-345bba2831ff5c5ab4d1ff75
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 82583d2845302db2951548815aeeb65ec8245210e1b3f35f9871222b58ba20bb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T19:55:25.617Z'
    finished_at: '2026-09-17T20:35:57.777Z'
    artifact_digest: 4ba7b11bc867e8ae48adccd54eaa298232996cee139ad0caf04b3fc19341fa55
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f4895a2a21726a811fd92481
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d01e2d3c564e8b31c1c32631
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 7dce1afe0fdd43aa1d0e4feea031d222163ed053450d755795c7e5b9b1b332b5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T11:08:18.939Z'
    finished_at: '2026-09-18T11:31:55.494Z'
    artifact_digest: 1305c15266e3c7a81377bac6480bd3ebd0eb54580efdb96dd5a10302f76039f2
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-de818039be22226f26ca13d6
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 756185e595a638daaaca686a3227a159bbebea77d198d371b2fd780c9a3839e4
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ee2067a549754eb4e7c81263
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-688daa4469dc40eefde9d5eb
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-53922deb9b47554a2db68cf1
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-be3da4f3a1bc016e779ec627
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8ba1d4ad9ba619ae4aa9906b
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ca562c61b2a543a61ce18990
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-78af796271aadf916a1785cd
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2a89b9097c2fd8ba44ec82d8
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9e89ea1df0c39fcde26eeeb9
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4659ae8f4d45246b61262070
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4f91b0fc9bc01d3a1ce3e886
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1d2000b06083c55c2ba0cd61
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fdd4d1925440774b10f70294
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d131a670c1fb6e2cec6601b4
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-90dbd6527b95003d433a9a0a
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-284e38b8e3c2d1011995e7b2
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 17d26c6bf27a3e5fa42113f021bf2b250140851aea8a51dcb29e71ea85465ffc
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:09:39.572Z'
    finished_at: '2026-09-26T11:26:46.912Z'
    artifact_digest: 5e15c583ed601b53256856b0f62aa348fec3a03cc76f327007241136eff85214
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e71ad607303217cdcf4a6ea7
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: a20108970eddbe026c332f8f0fef6001fa956bf246b5dee956c8c7586f878071
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:43:16.296Z'
    finished_at: '2026-09-26T11:59:41.121Z'
    artifact_digest: b458ebe1ef850179dd754bc08eb0a62bb0e46b7bbf068e00bb4230915cc296ed
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e96391aa30d5f71d3f26674b
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: de201a2dd0c317058bd0fb2437de496eaadfbdd3e21c3fd432d77169cc672e2e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T12:51:30.031Z'
    finished_at: '2026-09-26T13:07:42.195Z'
    artifact_digest: c9cece4a6c8412af4af92cf82807f3850d2b801045aacf7d48830d68278a660f
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cd161cc0b9107865345d8935
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 5b48c0a3883b7536cf6deb6ced03e3127349d55dfa5b78fcd7466dcabb3b1d46
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T23:50:31.951Z'
    finished_at: '2026-09-27T00:15:04.234Z'
    artifact_digest: 9641e1263e8cbd4aec2a63cf924f78c694de2fa481b3e6b278d288dc964e768b
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fc21801495b999b6d1b31fc9
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: edf31aeb17bae9696cd9be1db2cfdab1162934903a40aff8334d03e84edd5872
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T09:58:13.375Z'
    finished_at: '2026-09-27T10:21:29.406Z'
    artifact_digest: 601f3dfdaa45bbef34f649d3ddd7d3e53a7dc2ba372aa80398ec1e1a58170f59
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 535f482d7cdc0cd1e13f0fbc035d56fe54d5324ec6c5e44a0f6a38aa5c410534
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b693e80317a6cfb97ed022ef
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 1c7fc342e7e2f6dde52ad4d4bfb3dccda5184f524d128ad26d3d6aa8928b80df
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T15:30:37.315Z'
    finished_at: '2026-09-27T16:09:53.858Z'
    artifact_digest: cab9ee9d09f579ccae00bea019b0266d72e41c24a37e65651b84956de238bb61
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 7de8d1a3438ab2321faf9321bad739cc413dae7c907a508932fe752514cc164b
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-52e715f4c375562dbd73fb9b
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 1d2237db9cb9df68ce5a43a5ebb63dbe6b70f66b617d7ffa68d33c708da3cf9f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T22:29:15.770Z'
    finished_at: '2026-09-27T23:18:57.015Z'
    artifact_digest: 63668ccae6cd3a610be243d571de8e94f160e26926e4fd9f926a702b3a19dd3e
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 7de8d1a3438ab2321faf9321bad739cc413dae7c907a508932fe752514cc164b
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-64ada5bff66c9182252034d4
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:34:29.510Z'
    finished_at: '2026-09-30T09:53:47.264Z'
    artifact_digest: bf1056b84a11011e16a37703ce5da52de1172c40ecacc8002976e09efa49291d
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 6eddc0a2452b621fb528ec06951b5d43cec9c72d3305308841a2d4b663d252e3
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-eee43660654699c2801aa440
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 5f1a8774357c8a410887d8acb38f5965649452f860f70e2da4876c699133df48
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-51bac5f2b6fcb1afe03f21b7
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 5f1a8774357c8a410887d8acb38f5965649452f860f70e2da4876c699133df48
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-752547b5de58ebd4e4949917
    test_id: TEST-root-suite-batch-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
    binding_hash: 736649c24f5629bf7d6cec635ccbe1902f827fc48699895d8c60ce9c91c4cb1a
    fingerprint: f6b52168af6594de06bac9d47f96e84146639fa5512c93014f1b401ea2119299
    fingerprint_components:
      contract: c6f0eed611841cbd30570adc1648500ffaab807ce323a6e873ed56444e476997
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
      - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Exercises the batch diagnostic helpers in `test/root.test.ts`:
`getBatchFailureMessage` returns `null` for clean batches and a
descriptive string for timeouts, non-zero exits, and summary-count
mismatches. `parseSuiteSummaries` extracts bun pass/fail/file counts
from combined stdout+stderr output across multiple batch runs.
