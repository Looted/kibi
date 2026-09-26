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
---
