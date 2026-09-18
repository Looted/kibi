---
title: Canonical knowledge lanes drive packed status freshness
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-status-freshness
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d738b42270dd5aa595d2d1a5
    test_id: TEST-e2e-status-freshness
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:04:24.719Z'
    finished_at: '2026-09-18T10:37:16.478Z'
    artifact_digest: b15a7bc4b29c307248e8600846fa2a23b322db1a4047fbb1600a7cbceae82595
    contract_hash: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
    binding_hash: 3fb6e422690cfb3aecb3e4209ac6537d88973f25da6bba228f9b814ca0a29149
    fingerprint: ffca472a14a25839dab1702516c25ad5b8fd551b4e752bd45da14362072290f3
    fingerprint_components:
      contract: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
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
      - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-87ac8cecc3374018048462b3
    test_id: TEST-e2e-status-freshness
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T12:54:02.548Z'
    finished_at: '2026-09-18T13:26:16.375Z'
    artifact_digest: c856fd3f8a3a374f12bc697a485639499db3fe7263e1bc824f3939e0d3be4d40
    contract_hash: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
    binding_hash: 03cc1686bd6d75411eaf6e18ac2dea2e438392fbae4f5e3ef6edb1162ad313af
    fingerprint: ffca472a14a25839dab1702516c25ad5b8fd551b4e752bd45da14362072290f3
    fingerprint_components:
      contract: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
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
      - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6d55acfc875003893a247804
    test_id: TEST-e2e-status-freshness
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
    binding_hash: 03cc1686bd6d75411eaf6e18ac2dea2e438392fbae4f5e3ef6edb1162ad313af
    fingerprint: ffca472a14a25839dab1702516c25ad5b8fd551b4e752bd45da14362072290f3
    fingerprint_components:
      contract: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
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
      - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b3c1d61200ba7cc35b492881
    test_id: TEST-e2e-status-freshness
    scope: end_to_end
    outcome: passed
    code_snapshot: 39173f6fec98d8bef12deb1e15c088481cd27a0a27f5b8338a332e5e7417dbf7
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:41:12.486Z'
    finished_at: '2026-09-18T21:21:14.134Z'
    artifact_digest: 7449bffcd1f42651590f037f344e148e15f13c3305be565a861d03cb0488eb26
    contract_hash: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
    binding_hash: 03cc1686bd6d75411eaf6e18ac2dea2e438392fbae4f5e3ef6edb1162ad313af
    fingerprint: ffca472a14a25839dab1702516c25ad5b8fd551b4e752bd45da14362072290f3
    fingerprint_components:
      contract: e7a00d2ed00ddde2cbbd55218f5c6e1f1bfcc4da9b501213c474a9d48b82aa8e
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
      - symbol_id: SYM-e2e-test-cli-canonical-status-freshness
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---

Packed end-to-end regression for canonical knowledge lanes drive packed status freshness.
