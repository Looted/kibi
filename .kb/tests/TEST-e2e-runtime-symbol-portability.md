---
title: Packed runtime TypeScript symbol analysis remains portable
status: active
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-e2e-runtime-symbol-portability
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-runtime-symbol-portability
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-runtime-symbol-portability
    target: default
    native_id: 'documentation/tests/e2e/packed/runtime-symbol-analysis.test.ts::Packed E2E: relocated runtime preserves ts-morph analysis'
    source_file: documentation/tests/e2e/packed/runtime-symbol-analysis.test.ts
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c1f93971a2ba62ffedba8eb7
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:51:51.865Z'
    finished_at: '2026-10-30T19:51:52.643Z'
    artifact_digest: d57c81080144b758655f2500fadf205c527deaa7b84d1004efba68cb65c28979
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: f3d5d012bea9fc54a98cf6ef81320cfddaa1bd0b45b161dfcf76d8a74d7efab0
    fingerprint: e3accf6ed1fd9253aa856876bd13d13572f6ae9a71672699ccefdff6da8624a5
    fingerprint_components:
      contract: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 278676ce519e373d1240e00f5897cd62e9afde4bdb3d9eb7f58612836bc3d96c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-runtime-symbol-portability
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
A packed runtime installed in a separate consumer location resolves its builtin TypeScript symbol analyzer and reports expected symbols without build-machine paths in the shipped bundle.