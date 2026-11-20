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
    receipt_id: PR-03f6c8bedfc2419700d11608
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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
