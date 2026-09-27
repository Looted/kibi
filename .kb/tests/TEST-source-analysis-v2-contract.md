---
title: Snapshot-bound source analysis and installed multilingual ownership checks
status: active
tags:
  - multilingual
  - source-analysis
  - v2
  - e2e
  - consumer
text_ref: documentation/tests/e2e/packed/multilingual-source-analysis.test.ts; packages/plugin-sdk/tests/sdk.test.ts; packages/plugin-builtin/tests/builtin.test.ts; packages/cli/tests/plugins/source-analysis-v2.test.ts; packages/plugin-treesitter/tests/plugin.test.js
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
    receipt_id: PR-9eb9f776dbbf71e83eb8b600
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 3fb5dd53b7476da340d2b3067c5b7b28fa85705ecda8c7da9a92a5fd71df7fd9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T17:53:48.967Z'
    finished_at: '2026-09-26T18:29:22.028Z'
    artifact_digest: c92dba72a3f909a8f796fa7658e27145e47f54eb60fc6fc4365f362bdd0b3f04
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: ceda17aec6955a1d6ef4311a8872d0489105634f7d9027bbf47f21939a886c9b
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
