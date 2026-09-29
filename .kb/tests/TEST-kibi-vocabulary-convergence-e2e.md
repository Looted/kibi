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
---
