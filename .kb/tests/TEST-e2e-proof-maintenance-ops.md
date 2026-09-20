---
title: Proof receipt maintenance operations run end to end against a packed CLI
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-proof-maintenance-ops
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-proof-maintenance-ops
    target: default
    native_id: documentation/tests/e2e/packed/proof-maintenance-ops.test.ts::proof receipt maintenance operations
id: TEST-e2e-proof-maintenance-ops
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c0c85521475ae0d6fdf6f8bd
    test_id: TEST-e2e-proof-maintenance-ops
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
    binding_hash: 3641a7a9bebbc2418c0eed72794962882d317073a4e3082555368d69de0070a3
    fingerprint: 3f18e5b25f13814b178dd4b22d750cb2ebd0f43dd7181893405cd652cc7f5447
    fingerprint_components:
      contract: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4e32d5743cbd1a31791822b29d9b10218695f9e450568aa7e86afb8588295582
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-maintenance-ops
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c459858560a5b74c6a62586e
    test_id: TEST-e2e-proof-maintenance-ops
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
    binding_hash: 3641a7a9bebbc2418c0eed72794962882d317073a4e3082555368d69de0070a3
    fingerprint: 3f18e5b25f13814b178dd4b22d750cb2ebd0f43dd7181893405cd652cc7f5447
    fingerprint_components:
      contract: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4e32d5743cbd1a31791822b29d9b10218695f9e450568aa7e86afb8588295582
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-proof-maintenance-ops
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-proof-maintenance-ops
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bd7626f0b2bc8083cd2cb51c
    test_id: TEST-e2e-proof-maintenance-ops
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
    binding_hash: 3641a7a9bebbc2418c0eed72794962882d317073a4e3082555368d69de0070a3
    fingerprint: 3f18e5b25f13814b178dd4b22d750cb2ebd0f43dd7181893405cd652cc7f5447
    fingerprint_components:
      contract: 8ecb8862ac3eaba2c7f243c0054a56bcd3aca6aac01412c866cf305548c197e7
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4e32d5743cbd1a31791822b29d9b10218695f9e450568aa7e86afb8588295582
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-proof-maintenance-ops
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
