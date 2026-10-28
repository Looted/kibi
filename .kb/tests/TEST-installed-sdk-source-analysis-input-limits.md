---
title: Installed public SDK source-analysis input limit contract
status: passing
tags:
  - plugins
  - source-analysis
  - e2e
  - consumer
  - review:context-missing
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
    receipt_id: PR-f5743515b9f52373e3ddcd05
    test_id: TEST-installed-sdk-source-analysis-input-limits
    scope: end_to_end
    outcome: passed
    code_snapshot: b25666605ac0edaa4ee40b2fa05536cd246e3cf2513f28f59962e0d6a743d647
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:52:32.978Z'
    finished_at: '2026-10-28T10:53:37.478Z'
    artifact_digest: a352c213878487a480abc89cb1daa7f06be98e201927e8d5a9e9128bca2a84f6
    contract_hash: d08a6fea5d3239bcec4d9396720e54e7a31966e6cbfb6cd9b5dd4939cbb06ccd
    binding_hash: e7e770cd7d0f81266574e8fa8887ef8b02459f463346cb4c77c80f685368cf60
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
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
