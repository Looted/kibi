---
title: Packed runtime TypeScript symbol analysis remains portable
status: passing
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
    receipt_id: PR-2e64d80e2086ee17a38148af
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: da027577d5474fada5f3c1a3ed7d2122e13ee8f436f9f1ed31f9981d0d134553
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