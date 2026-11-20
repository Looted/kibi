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
    receipt_id: PR-3a5a2c39f1186962ee60279d
    test_id: TEST-source-analysis-v2-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
