---
title: Installed public SDK source-analysis input limit contract
status: passing
text_ref: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts
tags:
  - plugins
  - source-analysis
  - e2e
  - consumer
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-installed-sdk-source-analysis-input-limits
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
    target: default
    native_id: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts::enforces the installed SDK UTF-16 input limit using its public export and validator
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-089ffe55f59b810529269a37
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: failed
    code_snapshot: 5cef3dd546052eb73afd6ee4575947f7b57c29bbd6c4af2949083b2c2d23b415
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T14:01:01.807Z'
    finished_at: '2026-09-26T14:20:30.867Z'
    artifact_digest: 3f1248c91470a29de72079c98833498b7e9f85f56d1eb2964ddc35220ae85ed3
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: 780af5d466b960b5a5195ee902b38ddc2cfa64d3d91e41abf93101e4bef7c8bb
    fingerprint: 3136e1ecbe6666728b8d6958d7f53eeabca41a0bdb7035f8515eb5399789a8fd
    fingerprint_components:
      contract: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 2aa3e34f08f7f5e59a72d13fdde7a0a85201013b7680ee8bcdec675be11ff98a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +107 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3de11669bd8b5eb3647a6b42
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: a3c1a48e120e41d83d68ccf876658668c913dd55b88bb2ac812d0bc0bf2acccd
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T16:13:59.550Z'
    finished_at: '2026-09-26T16:48:47.610Z'
    artifact_digest: 930eef24b16e9c22c9ff81a84ada6b666cbf92db14067f5ddc7f3fa497217e38
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: 780af5d466b960b5a5195ee902b38ddc2cfa64d3d91e41abf93101e4bef7c8bb
    fingerprint: 3136e1ecbe6666728b8d6958d7f53eeabca41a0bdb7035f8515eb5399789a8fd
    fingerprint_components:
      contract: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 2aa3e34f08f7f5e59a72d13fdde7a0a85201013b7680ee8bcdec675be11ff98a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-installed-sdk-source-analysis-input-limits
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Installed public SDK input-limit contract

The test installs frozen local package tarballs into a relocated consumer and imports only the public SDK export. It checks the exact UTF-16 boundary, oversized ASCII and astral inputs, valid empty failed observations, and rejection of successful/partial/unsupported observations, symbols, uncovered ranges, and ranged diagnostics above the bound. The test does not relabel internal unit tests as consumer evidence or change the production proof rules.
