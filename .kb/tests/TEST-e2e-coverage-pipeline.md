---
title: CI coverage pipeline runs end to end over real Bun coverage
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-coverage-pipeline
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-coverage-pipeline
    target: default
    native_id: documentation/tests/e2e/coverage-pipeline.e2e.ts::coverage pipeline e2e
id: TEST-e2e-coverage-pipeline
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f420070fffb0599c300d18fd
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f7c5a313ea098adc0f23181c
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ec979f181409cdb509cc1630
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f376c682381b0f3bdde94ed9
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-61f64c57a16382322312c217
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-43027f5438c7a4b0ee84f378
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6ce7220ed057faf6dc165bac
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-84b11772a7da0aab1cf85c5c
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-457dbd49b554599cdd048597
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6aab39708a0c7914922f8320
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-eb398d51af4962c2505db3c9
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-64ea766afe6a1444d50e25ad
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-827538d5f12ccefcbe246991
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
