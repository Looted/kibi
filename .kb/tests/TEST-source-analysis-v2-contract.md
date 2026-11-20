---
title: Snapshot-bound source analysis and installed multilingual ownership checks
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7e425d98bcfef0ec39a5d958
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 7cca64eeeb76cb3a50bccbcc856100da4dc5e1f3ed13f169ab3347a0784f6f35
    binding_hash: 35fe2c644584dc7e6c81d35a040603e34c2f5b99d9b525a4b2603cc90f5bbcba
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This test spans the SDK, the builtin adapter, the Tree-sitter plugin and a packed end-to-end run. The contract is shared by all of them, and the installed ownership workflow (reject an unowned declaration, accept the same bytes once ownership is fixed) only shows up in a real install. Source: PR 282.
