---
title: Packed compile-intent plan hash binding and apply rejection
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-plan-compiler-hash
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9cd0e08254a0ded5beca2010
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: 3f0d0b221c823c6a0b41fbdbb964e9d0fe5a03e305a12a00f52dc4ac7e36d642
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-91044351852390a114a51835
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-04c1a4fd85179286a88f25cc
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d70182660df75ddd406102ec
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ca661bc22f506a6a86cea053
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-28f90ffcbe25ad2c61393996
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-10f306a41477b912f3137a4e
    test_id: TEST-e2e-plan-compiler-hash
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
    binding_hash: e88cd2b01f74b3142e9ec37789825233290a35e52c3363da763f307d61ab42b3
    fingerprint: 1955c375a3511bcfd022195ce700019547d7141182b5d8b1202a43e1b0ceb9c0
    fingerprint_components:
      contract: ab78fe9b3e2a69287f5f73b2725f28560ed1677829c32ba855347cd5bb830fd5
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
      - symbol_id: SYM-e2e-test-cli-plan-compiler-hash
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for packed compile-intent plan hash binding and apply rejection.
