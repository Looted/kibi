---
title: Packed runtime TypeScript symbol analysis remains portable
status: active
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-runtime-symbol-portability
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-runtime-symbol-portability
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-runtime-symbol-portability
    target: default
    native_id: 'documentation/tests/e2e/packed/runtime-symbol-analysis.test.ts::Packed E2E: relocated runtime preserves ts-morph analysis'
    source_file: documentation/tests/e2e/packed/runtime-symbol-analysis.test.ts
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c379f061a509f4f4b22e8052
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: b16d0d7da817cc017fa60a4dbdc5e7f26d43410cc9994692f64491f7889b7525
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-24T03:42:33.746Z'
    finished_at: '2026-09-24T03:43:46.508Z'
    artifact_digest: 2f5757ac29f7c2e8c75ecbdb9e9595dc908b3d33f9140e5024fca39a5476e7d0
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-af549fabc6d74e50d852b634
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: f086b14d281d0462a85a25192503bdbd21d3502b82b7fa59f4c1ad861069a8a1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-24T07:26:32.748Z'
    finished_at: '2026-09-24T07:27:22.585Z'
    artifact_digest: 0e4528c3675adc7a5d46c1bfefa0fdd4ebbc2cb4bf37e04cf318a2fc0ba1d83b
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e7ed30162e286b759150dc00
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: failed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T00:25:09.603Z'
    finished_at: '2026-09-25T01:08:19.383Z'
    artifact_digest: b735810ea775994b12268b16a00ac2f1277adb633d4fdfde29ff1a0415ae38e9
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +105 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4fe42d1038340afb713c5915
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T07:45:07.541Z'
    finished_at: '2026-09-25T08:24:59.336Z'
    artifact_digest: 3df3960ab64a0fafa2e101c1d6aa3d096f78e4fa7a4493b7ab09d2d33799d3ec
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f511032fdb042c23dec841cc
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-25T09:16:20.324Z'
    finished_at: '2026-09-25T09:43:44.763Z'
    artifact_digest: 48f597fb5c4fe62f41788cee9bb870ea4c0f80b428d5ecc557b366986092d922
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-951f7c800d969f726716a821
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: failed
    code_snapshot: 026ba98b14e8f9c63ae16ae56544c40c7a9aec88d99e765c467feab4c93aed44
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:37:01.236Z'
    finished_at: '2026-09-26T10:28:52.392Z'
    artifact_digest: 5ed6041777a5f930fb58af9f9643f36713c9610a885e9dd9822d3c3563759421
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +106 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8b0d1b13a8137a41cbb45fa7
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: failed
    code_snapshot: 5cef3dd546052eb73afd6ee4575947f7b57c29bbd6c4af2949083b2c2d23b415
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T14:01:01.807Z'
    finished_at: '2026-09-26T14:20:30.867Z'
    artifact_digest: 3f1248c91470a29de72079c98833498b7e9f85f56d1eb2964ddc35220ae85ed3
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +107 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-96d453d4703d815d9fe8437c
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: a3c1a48e120e41d83d68ccf876658668c913dd55b88bb2ac812d0bc0bf2acccd
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T16:13:59.550Z'
    finished_at: '2026-09-26T16:48:47.610Z'
    artifact_digest: 930eef24b16e9c22c9ff81a84ada6b666cbf92db14067f5ddc7f3fa497217e38
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
A packed runtime installed in a separate consumer location resolves its builtin TypeScript symbol analyzer and reports expected symbols without build-machine paths in the shipped bundle.