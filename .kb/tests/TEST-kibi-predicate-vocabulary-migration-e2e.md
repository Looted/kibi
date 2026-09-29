---
title: Packed predicate vocabulary conformance and migration
status: passing
verification_scope: end_to_end
tags:
  - vocabulary-convergence
id: TEST-kibi-predicate-vocabulary-migration-e2e
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-predicate-vocabulary-migration
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-32ce9e46e8ff337e626967fc
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 6210b15a19f64623c5d2ef96ec1720057aa063c0549f873fcb68459d84dc3259
    environment_hash: 80d5f490e94586d8d86e0ec684b1093c79ee2a22d74ec2a8cb2cafa17cfaed7f
    started_at: '2026-09-28T13:31:38.607Z'
    finished_at: '2026-09-28T13:33:36.446Z'
    artifact_digest: 6ca4e0fbc7a1226c3ea3ce27e05cbcfbc640f65eadeee5d9427874448dd9e845
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 40ef41614088d4978b125c1d8acc549fc9e4b3ace169f3e6f9cd7784994ac8f2
    fingerprint: 5803e6d1ae28c5a40520813633690571ab84665cb01c657e766074987e6d79e3
    fingerprint_components:
      contract: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
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
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f2e03dd0e71abc1cbcb389c3
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: d093e3b32a4f91620ad8a45f0d18a1579f24e0c5085f016350f9645596e0f4c0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-28T14:54:31.331Z'
    finished_at: '2026-09-28T14:55:32.262Z'
    artifact_digest: 5a03be1b5fed6b9e2e075acc7afc572fc18daf00fb15452826f8488192f98bcb
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 888ca069135eba970b5f29371ed64522e0baa5b90f29008026af4bb88be2d2bb
    fingerprint: 5803e6d1ae28c5a40520813633690571ab84665cb01c657e766074987e6d79e3
    fingerprint_components:
      contract: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
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
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e9b4cff4ec0a3252a08a5fd0
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 888ca069135eba970b5f29371ed64522e0baa5b90f29008026af4bb88be2d2bb
    fingerprint: 5803e6d1ae28c5a40520813633690571ab84665cb01c657e766074987e6d79e3
    fingerprint_components:
      contract: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
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
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-98ba7f52656bb8a55b4bf807
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 888ca069135eba970b5f29371ed64522e0baa5b90f29008026af4bb88be2d2bb
    fingerprint: 5803e6d1ae28c5a40520813633690571ab84665cb01c657e766074987e6d79e3
    fingerprint_components:
      contract: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
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
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bf8b3d7de8a2f3b50c09b92f
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 888ca069135eba970b5f29371ed64522e0baa5b90f29008026af4bb88be2d2bb
    fingerprint: 5803e6d1ae28c5a40520813633690571ab84665cb01c657e766074987e6d79e3
    fingerprint_components:
      contract: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
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
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
