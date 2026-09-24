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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c379f061a509f4f4b22e8052
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: b16d0d7da817cc017fa60a4dbdc5e7f26d43410cc9994692f64491f7889b7525
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-24T03:42:33.746Z'
    finished_at: '2026-09-24T03:43:46.508Z'
    artifact_digest: 2f5757ac29f7c2e8c75ecbdb9e9595dc908b3d33f9140e5024fca39a5476e7d0
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-af549fabc6d74e50d852b634
    test_id: TEST-e2e-runtime-symbol-portability
    scope: end_to_end
    outcome: passed
    code_snapshot: f086b14d281d0462a85a25192503bdbd21d3502b82b7fa59f4c1ad861069a8a1
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-24T07:26:32.748Z'
    finished_at: '2026-09-24T07:27:22.585Z'
    artifact_digest: 0e4528c3675adc7a5d46c1bfefa0fdd4ebbc2cb4bf37e04cf318a2fc0ba1d83b
    contract_hash: c2633824048151cca929554e20f0350577bc55f3489610a26bce9ed4ac7035ac
    binding_hash: 0da11650b9af2a1d99f98606302212f9c126b8b5c853f2d53664a94cc3886254
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
---
A packed runtime installed in a separate consumer location resolves its builtin TypeScript symbol analyzer and reports expected symbols without build-machine paths in the shipped bundle.