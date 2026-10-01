---
title: Native Linux CLI diagnostic controls preserve results and constrain metadata
status: passing
tags:
  - prolog
  - spike
  - linux
  - diagnostics
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-native-cli-suite-diagnostics
      target: default
  success_policy: all_required_first_attempt
id: TEST-native-cli-suite-diagnostics
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-49fb5561df8483ca2b72c213
    test_id: TEST-native-cli-suite-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 9d8c969a1036b5252bf5402afb67f30d32751cc3899cb5fcbb9ac8bcf1f314c9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T15:16:48.592Z'
    finished_at: '2026-09-30T15:16:52.788Z'
    artifact_digest: 8c1cfdf132650522309914a83cfbba5ad49ef7977406eea702bd12a1235c46af
    contract_hash: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
    binding_hash: e5bc628f2978342418aed7bd332a8d5318c3043a5d9d5ab29f53173919193933
    fingerprint: aadb6acc419c0b7fa8e363529e7954a2d5603e16e1df207e462e1fdce45d0229
    fingerprint_components:
      contract: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
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
      - symbol_id: SYM-test-native-cli-suite-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c9389c4544f14092a8f153da
    test_id: TEST-native-cli-suite-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: e1139bbe57b26478435f4fce1d176701eea36bacaefe8b62d84cb23491d4271d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T18:20:49.508Z'
    finished_at: '2026-09-30T18:20:54.504Z'
    artifact_digest: eed51e0760b70063fe6b8a0f00fc9564c184370aa5366cf39a854a1af49bcd31
    contract_hash: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
    binding_hash: b02ec10af709d1c54036fb87e965942405d7d584610091e040ac1379162cfaf1
    fingerprint: aadb6acc419c0b7fa8e363529e7954a2d5603e16e1df207e462e1fdce45d0229
    fingerprint_components:
      contract: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
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
      - symbol_id: SYM-test-native-cli-suite-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d26b735f0621ed83e4b449da
    test_id: TEST-native-cli-suite-diagnostics
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
    binding_hash: 913b59e94fa4bee57ce12d9b411b1769d9e803b6dc182d3cc24868dc5b5ae712
    fingerprint: aadb6acc419c0b7fa8e363529e7954a2d5603e16e1df207e462e1fdce45d0229
    fingerprint_components:
      contract: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
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
      - symbol_id: SYM-test-native-cli-suite-diagnostics
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-native-cli-suite-diagnostics
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ffd4efc194558bc027dc2c8a
    test_id: TEST-native-cli-suite-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
    binding_hash: 913b59e94fa4bee57ce12d9b411b1769d9e803b6dc182d3cc24868dc5b5ae712
    fingerprint: aadb6acc419c0b7fa8e363529e7954a2d5603e16e1df207e462e1fdce45d0229
    fingerprint_components:
      contract: 165552778344c00edde783e9bb42c86281225f08909599a05d15332c3b293c0b
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
      - symbol_id: SYM-test-native-cli-suite-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
