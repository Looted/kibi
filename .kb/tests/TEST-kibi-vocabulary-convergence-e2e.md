---
title: Packed vocabulary-convergence checks and subject reuse
status: passing
verification_scope: end_to_end
tags:
  - vocabulary-convergence
id: TEST-kibi-vocabulary-convergence-e2e
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-vocabulary-convergence
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7ceb10f3bad0726964543f6a
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 7795b1b3d0d6f932a673d1a68b99b4d66b8fa8a9e19abcc1b026fe1778d52cd4
    environment_hash: 80d5f490e94586d8d86e0ec684b1093c79ee2a22d74ec2a8cb2cafa17cfaed7f
    started_at: '2026-09-28T10:03:37.827Z'
    finished_at: '2026-09-28T10:04:56.767Z'
    artifact_digest: 0868f4a70d95d1b0d2c335580c5f47c6f55be5fbc5dbcf351ae168ab413eb0e3
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: ec604defb9308b591449aeee5c4402a449cde86e20b2fca33954aa8461806e22
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6c4afc8a800c975d3e0bec62
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: fc743b20ddcd50c02f923da6e12b0d606ce2f90ac0568990126fc335cfa16d54
    environment_hash: 80d5f490e94586d8d86e0ec684b1093c79ee2a22d74ec2a8cb2cafa17cfaed7f
    started_at: '2026-09-28T10:59:49.419Z'
    finished_at: '2026-09-28T11:01:12.201Z'
    artifact_digest: 57bc7db441f9021c63037f8adeb281697122a32f7c34a19ef37b4c8e7e967d90
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: 812d5200b5cab1726f5a54905cffa658606eeef09212c801ed51da27ef77c86b
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f447b13cbb89c76e1de607cc
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-43abc6ca18cd703ec1de7f1f
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: a3fe505618ff579980a6f185d54387cd45dcf129ae2597ceaae05cd749e374c4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T16:59:00.539Z'
    finished_at: '2026-09-29T17:20:23.357Z'
    artifact_digest: 0377648637a4a91448a458efbd8e2b41b4a87db69d5b5bb5b0e96f31624c281b
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e4ac2764977edaafa7035e9a
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: b5ef7d5743fa7635b43d156a8d17f8a77b871bf6deee2810bd12888978abab72
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T19:41:51.152Z'
    finished_at: '2026-09-29T20:16:15.415Z'
    artifact_digest: 14a5c4954ed185e8c9d585ddae17a339ac17dbca1bff1c3bdb8ed7501770392d
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5ebbd4afe0444a337a2cb03f
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: failed
    code_snapshot: 9bcc8b513a01ef4f9111de27aade8bd53f673d9ddb4e46f4abc140bd47a86049
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:12:05.199Z'
    finished_at: '2026-09-30T08:38:22.434Z'
    artifact_digest: 44c949f581d06af649a1081ae9da1ead93f0ae21026d70041fa4d94b47bf4932
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +129 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a5eb445016df420499941bdc
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: ed1115190903fc4f82bb767e1b0059128bf1cbde83d1399fa5ad8c0e00436e53
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T08:44:35.132Z'
    finished_at: '2026-09-30T09:14:07.509Z'
    artifact_digest: 8e767a8048bc0337afb4a16cb7c6e110f417e9b6181130df0b402240760ca7fe
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7f9e8453693d77909cf84c60
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c3c9302244ec6e144d390e104379a6e3429b9a4b9213aef16ed2eaa1d918afde
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T19:02:28.214Z'
    finished_at: '2026-09-30T19:38:21.534Z'
    artifact_digest: 3dc2234689cf3a5cdb82deb224ed2f23cad0fdf7d9deeace00bc19308244c4ba
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e7a36ecc229b0f5ffa04df7f
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 08c571a1159e02fceab7228e3e5602a4a4b3640c8cd9b07b52695408433f3d2c
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-30T20:55:45.152Z'
    finished_at: '2026-09-30T21:39:09.186Z'
    artifact_digest: 1231ed5f54da37e9f82308adb82a0e2dffcd3ea781f5ccd044c5307ff8b49f96
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: af7f6f6a74bed952139f3546f5bad87c1bc4c54f7aadad006ebfc9a0c4252e67
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
