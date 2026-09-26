---
title: The built VS Code extension activates against a real Kibi workspace
status: active
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-vscode-extension-lifecycle
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-vscode-extension-lifecycle
    target: default
    native_id: documentation/tests/e2e/vscode-extension-lifecycle.e2e.ts::vscode extension e2e
id: TEST-e2e-vscode-extension-lifecycle
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9bb74b5d016ca759f261faa6
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-acde724ef25b49153d6f584d
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a68a93c2423e844f7f66c902
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-17f300c40dcf27b7f4fa5c8b
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: failed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T08:52:59.120Z'
    finished_at: '2026-09-20T09:20:20.623Z'
    artifact_digest: 6a35cc4218dfbdbdd7f76fcccb34a2d971a94d01c32833c460b43d170a2022aa
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-09a9b6e198f8fb1887de2be3
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: failed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:27:33.038Z'
    finished_at: '2026-09-20T09:52:11.845Z'
    artifact_digest: 7b579942749a20b5ca5d1fbcd01174219e71eeebe78f7f28ac8ab2762519b460
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ca43a5c12443aa8f0c2bea5f
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: failed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T09:59:34.733Z'
    finished_at: '2026-09-20T10:25:35.154Z'
    artifact_digest: bf32ee63c98ab3d20f383a41a74fb56f64cc5a9e6978089817c42d9181dcbbca
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0b449746bf16356b438febc0
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-20T11:00:28.299Z'
    finished_at: '2026-09-20T11:25:25.482Z'
    artifact_digest: 3b2520e4b9ee5bb9883efcc90c28f3085cbe23f1937dee57fd83f08ad4d339f6
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d5b434da329f9330085ce953
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-20T13:30:11.770Z'
    finished_at: '2026-09-20T13:56:18.628Z'
    artifact_digest: 9c1ef8e548479f9819547ecc45d29f56da14060a7003987c4fadf37690688771
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-47cc9dd4da3a831816e37676
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T12:00:29.159Z'
    finished_at: '2026-09-22T12:51:44.779Z'
    artifact_digest: 8ac234a8e3eff4fb727173cf1cf630ff8e544428281fcd58d3aa19e3ebe6a860
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bd1107d4f79f1ad245f64943
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-22T13:10:15.732Z'
    finished_at: '2026-09-22T13:38:55.177Z'
    artifact_digest: 5093b95178d31888dc8691e48364671fe9579fbc7da67ef6ff29d0cb7acc77ce
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-908e4b73ab85a5374dfcf56a
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c82819865fe933baf76f1a54
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-21fdd9f2ded715a043ed3f58
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-48f0301843653931892beffc
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: failed
    code_snapshot: 026ba98b14e8f9c63ae16ae56544c40c7a9aec88d99e765c467feab4c93aed44
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:37:01.236Z'
    finished_at: '2026-09-26T10:28:52.392Z'
    artifact_digest: 5ed6041777a5f930fb58af9f9643f36713c9610a885e9dd9822d3c3563759421
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 42b2050e7beed6cb6d197a09614906b8d37320acbe1dbb90c69be044a5c1d75d
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +106 more'
---
