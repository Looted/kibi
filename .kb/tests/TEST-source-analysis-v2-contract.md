---
title: Snapshot-bound source analysis and installed multilingual ownership checks
status: active
text_ref: documentation/tests/e2e/packed/multilingual-source-analysis.test.ts; packages/plugin-sdk/tests/sdk.test.ts; packages/plugin-builtin/tests/builtin.test.ts; packages/cli/tests/plugins/source-analysis-v2.test.ts; packages/plugin-treesitter/tests/plugin.test.js
tags:
  - multilingual
  - source-analysis
  - v2
  - e2e
  - consumer
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-source-analysis-v2-contract
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-multilingual-source-analysis
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-multilingual-source-analysis
    target: default
    native_id: documentation/tests/e2e/packed/multilingual-source-analysis.test.ts::passes a baseline, rejects an unowned declaration, and accepts its authored owner in Python, Go, and Rust
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ab3967f644b04fe73f074956
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 659c3bc1e0563cc76ac3e09aeb4bdc34e2f6d28ab46e56ae7816a0c8701b5b71
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T08:26:31.476Z'
    finished_at: '2026-09-26T08:27:43.374Z'
    artifact_digest: b6fe57b9e40641771c55c9157f23b45e82f805b39c155bc7cad922b50aa403a6
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: c8e987c9a94f4861878dea009817494cb68f25e943798ae6e24511f3cf007378
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8b4b3aa175b61ca16451fd8a
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 026ba98b14e8f9c63ae16ae56544c40c7a9aec88d99e765c467feab4c93aed44
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:22:00.008Z'
    finished_at: '2026-09-26T09:22:44.584Z'
    artifact_digest: e642e12bee4ffc941800da913438f9719a0cab4d66e9710440e55069372ddf66
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: c8e987c9a94f4861878dea009817494cb68f25e943798ae6e24511f3cf007378
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4dee746588b557f27a4eaa87
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: failed
    code_snapshot: 026ba98b14e8f9c63ae16ae56544c40c7a9aec88d99e765c467feab4c93aed44
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:37:01.236Z'
    finished_at: '2026-09-26T10:28:52.392Z'
    artifact_digest: 5ed6041777a5f930fb58af9f9643f36713c9610a885e9dd9822d3c3563759421
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: c8e987c9a94f4861878dea009817494cb68f25e943798ae6e24511f3cf007378
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +106 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e32dfcdabd5f0b1f08921a9f
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: failed
    code_snapshot: 5cef3dd546052eb73afd6ee4575947f7b57c29bbd6c4af2949083b2c2d23b415
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T14:01:01.807Z'
    finished_at: '2026-09-26T14:20:30.867Z'
    artifact_digest: 3f1248c91470a29de72079c98833498b7e9f85f56d1eb2964ddc35220ae85ed3
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: c8e987c9a94f4861878dea009817494cb68f25e943798ae6e24511f3cf007378
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +107 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1f94c7c47c639549ba5f7971
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: a3c1a48e120e41d83d68ccf876658668c913dd55b88bb2ac812d0bc0bf2acccd
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T16:13:59.550Z'
    finished_at: '2026-09-26T16:48:47.610Z'
    artifact_digest: 930eef24b16e9c22c9ff81a84ada6b666cbf92db14067f5ddc7f3fa497217e38
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: c8e987c9a94f4861878dea009817494cb68f25e943798ae6e24511f3cf007378
    fingerprint: 1f87cbd90cbf32481869095020e3132c8714995feac55cc2e2221a13c2ed64ae
    fingerprint_components:
      contract: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: dc9d68222b2caa647473bb983c6df73b6f1c85aba1ea146fab2608328937aea6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-source-analysis
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# V2 extractor validates completeness, coordinates, and identity

Run the SDK, builtin, CLI service and Tree-sitter plugin test suites:

```sh
bun test packages/plugin-sdk/tests/sdk.test.ts packages/plugin-builtin/tests/builtin.test.ts packages/cli/tests/plugins/source-analysis-v2.test.ts packages/plugin-treesitter/tests/plugin.test.mjs
```

The suites must cover empty successful output, asynchronous providers, partial/failure states, malformed and out-of-bounds results, nested declaration containers, CRLF, emoji UTF-16 columns, and authored identity under unambiguous locators. This test record remains pending until the integrated run and its evidence are reviewed.