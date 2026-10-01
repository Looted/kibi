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
    receipt_id: PR-6167befeb7e6d70beacc807d
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:34:29.510Z'
    finished_at: '2026-09-30T09:53:47.264Z'
    artifact_digest: bf1056b84a11011e16a37703ce5da52de1172c40ecacc8002976e09efa49291d
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
    receipt_id: PR-f95a9acae3836ab8b840c111
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 9d8c969a1036b5252bf5402afb67f30d32751cc3899cb5fcbb9ac8bcf1f314c9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T15:25:15.737Z'
    finished_at: '2026-09-30T15:25:30.377Z'
    artifact_digest: 673973e8b3eb1cbf440713d2d8b2c207d95c444ab50072c414e90fda0c801e57
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 164569264b1e6d6a2c8332980d5d7f158b7cddcee90201e0e5f8551a587a39b7
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
    receipt_id: PR-291b1caa66aeabdac99cdd8f
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 164569264b1e6d6a2c8332980d5d7f158b7cddcee90201e0e5f8551a587a39b7
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3908e1962d308fd0a33382bb
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 164569264b1e6d6a2c8332980d5d7f158b7cddcee90201e0e5f8551a587a39b7
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
