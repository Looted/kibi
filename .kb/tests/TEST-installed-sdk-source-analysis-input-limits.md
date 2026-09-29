---
title: Installed public SDK source-analysis input limit contract
status: passing
tags:
  - plugins
  - source-analysis
  - e2e
  - consumer
text_ref: documentation/tests/e2e/packed/installed-sdk-source-analysis-input-limits.test.ts
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
    receipt_id: PR-c1fdb33015fe831ddff6b7f0
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: 3fb5dd53b7476da340d2b3067c5b7b28fa85705ecda8c7da9a92a5fd71df7fd9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T17:53:48.967Z'
    finished_at: '2026-09-26T18:29:22.028Z'
    artifact_digest: c92dba72a3f909a8f796fa7658e27145e47f54eb60fc6fc4365f362bdd0b3f04
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: d5e751da1e675fcff672685f8cb77262d54d4c1b7fd5c35d80a4c2a263365592
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f901d1bcb9f235ec07b86021
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: 279c75d5e89a7f57373d2a99f32dc668cce54b9c7c454df115722fcb2088762d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T21:19:41.697Z'
    finished_at: '2026-09-26T21:51:59.383Z'
    artifact_digest: ea2ec21bf8ebe523493b8797005c5699ed64e6437a611a7893219d88cbebb0b2
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: d5e751da1e675fcff672685f8cb77262d54d4c1b7fd5c35d80a4c2a263365592
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dde7ad2839e50f3fa9788e07
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: dd570855ae419209361167772401788be6d17ae147c25dff13ad1e92daed3d43
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T10:17:38.192Z'
    finished_at: '2026-09-27T10:52:33.895Z'
    artifact_digest: 2200dffdd4f1cf4aab062fe2f655a48a020797a1661bde4140baa964edd0aa71
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: d5e751da1e675fcff672685f8cb77262d54d4c1b7fd5c35d80a4c2a263365592
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7fe47dba9d45538b63a35e0a
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: f7be4ad7689f79542c901c3d4abd17321b2de74dc5a42a4f3e181fa4388301fb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T11:03:41.438Z'
    finished_at: '2026-09-27T11:38:11.633Z'
    artifact_digest: d6ba04f64f847cb08f207889bbb37118a5a1399f665d6b626f1d259ddce79b44
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: d5e751da1e675fcff672685f8cb77262d54d4c1b7fd5c35d80a4c2a263365592
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-596d2cd42eb1ec6bc688ef65
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: 1fff1f009c4166d3a2b921b8fb10f2a748785d65666b8d98e83d60de502ef9aa
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
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7ae98439b3d7c5c6fe45636b
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: 1fff1f009c4166d3a2b921b8fb10f2a748785d65666b8d98e83d60de502ef9aa
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-963a7b675a1c93fa32f9a3a2
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: 1fff1f009c4166d3a2b921b8fb10f2a748785d65666b8d98e83d60de502ef9aa
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
