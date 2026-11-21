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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-de1bf49de96de8b464b256ca
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: 15f80f17e767428067dea09a3b7a67ff8b16227e3df1afa2fedfa46fd4970901
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This is the installed regression for the oversized-observation repair from PR 282.
