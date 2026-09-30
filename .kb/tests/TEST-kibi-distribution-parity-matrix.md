---
id: TEST-kibi-distribution-parity-matrix
title: Source, packed, dogfood, and pinned distribution parity tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-distribution-parity-matrix.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - parity
  - distribution
  - dogfood
  - packed
  - cli
  - mcp
  - e2e
links:
  - type: validates
    target: SCEN-kibi-distribution-parity-matrix
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-distribution-parity
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-07b13f8be889cd9fabf784dd
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 73304a19a83bfbaca3e3d0e52a7b97d454de2c753b8405c2eda73ca29bbef16c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T04:59:46.377Z'
    finished_at: '2026-09-09T05:44:19.775Z'
    artifact_digest: 50031ad292386cf2c587290d2bf043370abe66901e46814bcbe103fa994f6f7e
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d9e9c0e929a8edf638141b6f
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 558de15f49a44612ab5506fd412ea2e1c0d774b8f8745243c0df15bb012d3ba2
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T06:05:52.608Z'
    finished_at: '2026-09-09T06:50:18.571Z'
    artifact_digest: 4f935be4b3d114a7b897b05094252c069c971d14ef24fb3e406f99f0683792b3
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a34d891b08472ced3152e87f
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T07:39:42.865Z'
    finished_at: '2026-09-09T08:30:39.011Z'
    artifact_digest: 133420075f0adea4c311c3138f41d8ee31c6f8e7bd30355041389b5d200224ae
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-core-adr-supersession (failed), SYM-test-core-journaled-engine-persistence (failed), SYM-e2e-test-agent-guided-migration-orchestration (failed), SYM-e2e-test-kibi-logical-requirement-coverage (failed), SYM-test-packed-fresh-verification-receipts (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f0afcca3d8a02318f7294968
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: de6dec7cc909eaae74998d202ddb4726ccf6e98eb593118a30fd01e93e379e31
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T08:39:23.385Z'
    finished_at: '2026-09-09T09:23:52.214Z'
    artifact_digest: 205a84ca07cf48423f589304f5887175724238701dc00650fc5e5c6acaf165c1
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-270d44dd6c4aca396b0e8edf
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 88f7db573953eb069d10f6e92c42d41ff7b777c025efedbc8c087901bdf86f70
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-09T09:37:57.606Z'
    finished_at: '2026-09-09T10:22:19.843Z'
    artifact_digest: d113351a4cc8ce4d655ad86ddf8339c9a390ad00ed397e90eb41a0a9c494c287
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-44aa550b1bcd20e5fc083606
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 79ff0d34362721426b024912cd0b299cb0a72531a626020d29837330b1ec6434
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-09T23:33:23.834Z'
    finished_at: '2026-09-10T00:22:01.917Z'
    artifact_digest: 4f4ad525ec33f63a0645a9fe17519fe95eef71efc4eeda86cba43334e730afcd
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c3630fcb7b93ecae24e2ca65
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 79f838abae86001aa78ba97d7be9f63467709effbd55b97118f9a0ccef937803
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-12T00:53:36.381Z'
    finished_at: '2026-09-12T02:23:02.095Z'
    artifact_digest: 729ba6000636c5b9faca47c20a964ecb8e3b5ed9f9a1c753d181e5febbb50b8c
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bcda1627964ac710d516d5d2
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 609b27d4e5672c4000011b090499931e6a1fe38be1981e2088de3e3e4fb2f277
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T20:17:13.278Z'
    finished_at: '2026-09-13T21:56:21.890Z'
    artifact_digest: c976524424d5b291f4e58e762a7e0fe0a5f0e09d457a6213cfaaa0195a072de4
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dac5fd5d35e76262789c2fe4
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 0b5814a1764ceb7e33a105329bcfac1ca4ab366405f4083d213938472376fb44
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-13T22:14:34.497Z'
    finished_at: '2026-09-13T23:51:44.048Z'
    artifact_digest: f22bd2804415e7b28c082cc4e0491f9cc5b9947a5bb0b6aa76bd06e39712bf82
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-52520b6b533e6d00ef1445ea
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 32fc8076ce1ce9656d665c040aae2f438b4d47e12d23ad67c7e2396871cdb96b
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T04:53:57.354Z'
    finished_at: '2026-09-14T06:13:26.255Z'
    artifact_digest: 738ce45f97ae1097eadd640367ac094351b9f6ecf2c331c84e56b71e495f7f77
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-576b6efda01ab5fab31e6d27
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: ed40ba5e905305e0049ad3548381193ed09b7a4c16602e2deb3c109eb7acda13
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T06:29:52.699Z'
    finished_at: '2026-09-14T07:37:41.045Z'
    artifact_digest: 9e21e6884d6f07025a28d1aff21db0b67358a05dc6a0cc0df2654eaacf06dcfb
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-975efde5b886c44609c3d6d7
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 807961781c537e824f0bd98a27b157fdb699f858cd39d2bd42acef64a5f2222a
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-14T13:11:45.423Z'
    finished_at: '2026-09-14T13:37:56.113Z'
    artifact_digest: fadc0c61f917b435961101344a5a47a8790fd55e5b9d0f389a413cce82a57531
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cc0be62eef8e35d79942d620
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: c613c587e4ca4b7b68ef60af5587603c701a24922708732b2e3202cfd1e44c62
    environment_hash: 099f7c7810817359ceb53f590959a4934481728356256c4ad8d76cebc5094929
    started_at: '2026-09-15T03:23:50.237Z'
    finished_at: '2026-09-15T03:55:17.162Z'
    artifact_digest: ec6b0a857165cc564b40009d6e1f29fdaa822402c84a5f3b4b67b11b265d8826
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f10d2c5559c919e57ec19e6e
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: a4e7bee0eccf1ef30deb244bf5e02822ca9e2a1be722875afeca276af1d00111
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T13:38:13.291Z'
    finished_at: '2026-09-17T14:08:43.421Z'
    artifact_digest: 4b46bd7e42bc97e7e45ccb151d3a1ad8ccea0423f2db0cc425f71995ffa9e3ef
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-833c72e0ee8a26db33523ced
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 1972508a4652f82750d93bee293666961045af7bcdd157c91e02647eb24ecfdd
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T14:29:34.065Z'
    finished_at: '2026-09-17T15:00:23.481Z'
    artifact_digest: accb6c6e18f474a89e4bbe8c043408988ae33c7c519bba0b407911c115668680
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7ba5f8a7793bb104840d809c
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 59396fc4de3f764873a8a552bcced7d61f442f84fa3bf0465ec0c7a0913a4e88
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-17T17:26:27.052Z'
    finished_at: '2026-09-17T18:09:58.071Z'
    artifact_digest: 444bb68a2c1abf8fec72ed6f4d7706c83ea382ef4d27c447919af7b99a789681
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e832912d3c89006d1f08eed0
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 82583d2845302db2951548815aeeb65ec8245210e1b3f35f9871222b58ba20bb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T19:55:25.617Z'
    finished_at: '2026-09-17T20:35:57.777Z'
    artifact_digest: 4ba7b11bc867e8ae48adccd54eaa298232996cee139ad0caf04b3fc19341fa55
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-886d15afab39633d0d550431
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3256f63d030df324602c730f
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 7dce1afe0fdd43aa1d0e4feea031d222163ed053450d755795c7e5b9b1b332b5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T11:08:18.939Z'
    finished_at: '2026-09-18T11:31:55.494Z'
    artifact_digest: 1305c15266e3c7a81377bac6480bd3ebd0eb54580efdb96dd5a10302f76039f2
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-50c41f530c8cf5894937c4c6
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 4f6312d966ae3adae9df18164b15d6beeddc60900fe4c1f89b61ca3aece42494
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-43eaacfa33a1ef30978defe3
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e829702e904d22780083237b
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-45d94173446f109eb30900b0
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-60d6e62313dd49c76edf1f0d
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-67c62d7365ffdf282f2c987e
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b4f1472b1f7edb8c2aedb2fa
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-790e649bfd7cf1de86f80769
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8abaf4de136cd51ed8b1a59c
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-66e49751dc72c26fa4f2b858
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b36f7e0e6673b18e374cdffb
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fd5c0b0ecef6150b7d4a2669
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-169ba285bef5d1bdf5046108
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-98e5d464c0bc5b4d5f28c86c
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d1ad46ede01faa496d594583
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9b4a9ddec19f77914e113d90
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9dbe21168550a41983224845
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 17d26c6bf27a3e5fa42113f021bf2b250140851aea8a51dcb29e71ea85465ffc
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:09:39.572Z'
    finished_at: '2026-09-26T11:26:46.912Z'
    artifact_digest: 5e15c583ed601b53256856b0f62aa348fec3a03cc76f327007241136eff85214
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-852fdf866ba60fd286974e78
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: a20108970eddbe026c332f8f0fef6001fa956bf246b5dee956c8c7586f878071
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T11:43:16.296Z'
    finished_at: '2026-09-26T11:59:41.121Z'
    artifact_digest: b458ebe1ef850179dd754bc08eb0a62bb0e46b7bbf068e00bb4230915cc296ed
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3e9dad15834f7ec61d058499
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: de201a2dd0c317058bd0fb2437de496eaadfbdd3e21c3fd432d77169cc672e2e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T12:51:30.031Z'
    finished_at: '2026-09-26T13:07:42.195Z'
    artifact_digest: c9cece4a6c8412af4af92cf82807f3850d2b801045aacf7d48830d68278a660f
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-78a201eb3270fab216a36da1
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 5b48c0a3883b7536cf6deb6ced03e3127349d55dfa5b78fcd7466dcabb3b1d46
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-26T23:50:31.951Z'
    finished_at: '2026-09-27T00:15:04.234Z'
    artifact_digest: 9641e1263e8cbd4aec2a63cf924f78c694de2fa481b3e6b278d288dc964e768b
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9d0858f50df3c8271b8025f6
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: edf31aeb17bae9696cd9be1db2cfdab1162934903a40aff8334d03e84edd5872
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T09:58:13.375Z'
    finished_at: '2026-09-27T10:21:29.406Z'
    artifact_digest: 601f3dfdaa45bbef34f649d3ddd7d3e53a7dc2ba372aa80398ec1e1a58170f59
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 84bc9c86cb67e696a4446ee834b640e57af83e77657e4a76318c5dcba12f256c
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-704489fb5a706e6c0d3c929c
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 1c7fc342e7e2f6dde52ad4d4bfb3dccda5184f524d128ad26d3d6aa8928b80df
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T15:30:37.315Z'
    finished_at: '2026-09-27T16:09:53.858Z'
    artifact_digest: cab9ee9d09f579ccae00bea019b0266d72e41c24a37e65651b84956de238bb61
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 7dab17080e1d99123d53b383fbc5d19d76925edc4fe6ce300cb83336ff4a4d21
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7a019fd0bc2af057d3ac0bf7
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d2237db9cb9df68ce5a43a5ebb63dbe6b70f66b617d7ffa68d33c708da3cf9f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-27T22:29:15.770Z'
    finished_at: '2026-09-27T23:18:57.015Z'
    artifact_digest: 63668ccae6cd3a610be243d571de8e94f160e26926e4fd9f926a702b3a19dd3e
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: 7dab17080e1d99123d53b383fbc5d19d76925edc4fe6ce300cb83336ff4a4d21
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b1d7c5062e2d8b6204e91924
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: e32538a6cf0e331dcc003597f407aaa18ff15ff6cc7530efc7c2d3648cba75ea
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f73a303aac622d23aa4afb32
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: e32538a6cf0e331dcc003597f407aaa18ff15ff6cc7530efc7c2d3648cba75ea
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c90d40d2d52aed594362eddc
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: a814ae923de9d4366384f319b994182bf40e9ae7ab2d016bfbd9b3893b635496
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-71a8771c78633ed812971ceb
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: a814ae923de9d4366384f319b994182bf40e9ae7ab2d016bfbd9b3893b635496
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e5fa8f20d4ff2b06735fe3de
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: a814ae923de9d4366384f319b994182bf40e9ae7ab2d016bfbd9b3893b635496
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-847aff60c543b1165880006c
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: a814ae923de9d4366384f319b994182bf40e9ae7ab2d016bfbd9b3893b635496
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4e71c2c615adf58ac8fba36a
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: a814ae923de9d4366384f319b994182bf40e9ae7ab2d016bfbd9b3893b635496
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-aecd36b6c6cafc5838b198dc
    test_id: TEST-kibi-distribution-parity-matrix
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
    binding_hash: a814ae923de9d4366384f319b994182bf40e9ae7ab2d016bfbd9b3893b635496
    fingerprint: 1a2ebcfa3a72e49e439ad2ee57852a0051ffef7bb0478a4bca8a6d80dd9996f4
    fingerprint_components:
      contract: 43234b210205cc387390fbfa17dbb1c0e24034c7f8caaa64cbb546fff4e23035
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
      - symbol_id: SYM-test-packed-distribution-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Exercises `kibi.distribution-parity.v1` through source and freshly packed CLI/MCP binaries, then optionally through the binaries actually resolved by audited projects. The fixture set checks proposition ingestion, source-bound contradiction witnesses, conservative proof stages, dependency-ordered repair plans, snapshot-bound receipt gaps, and telemetry acceptance. Align is expected to resolve this checkout and match; BizzWords' older pinned CLI/MCP capabilities must be reported as unsupported rather than silently passing, with a named upgrade action for each divergence.
