---
title: CI coverage pipeline runs end to end over real Bun coverage
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-coverage-pipeline
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-coverage-pipeline
    target: default
    native_id: documentation/tests/e2e/coverage-pipeline.e2e.ts::coverage pipeline e2e
id: TEST-e2e-coverage-pipeline
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f420070fffb0599c300d18fd
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T19:52:45.876Z'
    finished_at: '2026-09-19T20:33:53.928Z'
    artifact_digest: c07890b19bad57525f3d20afb4b81d9ade6918e879a58d30516e81c53116f3f1
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f7c5a313ea098adc0f23181c
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: failed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T21:33:49.509Z'
    finished_at: '2026-09-19T22:09:14.664Z'
    artifact_digest: 12322021e6a74b565709314d5ebdfe7bc12de7b0c075ddc6c461878ce518f337
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +102 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ec979f181409cdb509cc1630
    test_id: TEST-e2e-coverage-pipeline
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:24:42.197Z'
    finished_at: '2026-09-19T23:01:02.646Z'
    artifact_digest: 15804a5d3fe1df0236a1702bf6ce5a978953313dc2a11106eedc9653f4b18d57
    contract_hash: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
    binding_hash: f862d7a6c8ea6d2065ce41763fe9e0cbbb42440296a8fe9b19c28b3cd07c33a5
    fingerprint: afff8a3a1ab1c2915aa7a8f5f96feaaed6282cb9cdf39884573996c191715845
    fingerprint_components:
      contract: 5dd3923458cf0ae34253406c878df1627765803def2fbe7c7d07518f8412b1e4
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 6e11ee05b8a0b4807b82165219f96466dda228ebb29e570df8616ae3d0e18bfe
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-coverage-pipeline
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
