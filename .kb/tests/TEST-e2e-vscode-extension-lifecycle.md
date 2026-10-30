---
title: The built VS Code extension activates against a real Kibi workspace
status: active
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-vscode-extension-lifecycle
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-vscode-extension-lifecycle
    target: default
    native_id: documentation/tests/e2e/vscode-extension-lifecycle.e2e.ts::vscode extension e2e
id: TEST-e2e-vscode-extension-lifecycle
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3f5f35d9967834f42dfc9071
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 91111697f44f76ef846b59b9d6ba6cfc1da295a8a8076e33d9a46e6c923c8a5f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:08:21.869Z'
    finished_at: '2026-10-29T17:08:26.685Z'
    artifact_digest: 3c73e71c67e9ef42d2c1b513dec62fe02fb79518a633f468202f6d1846b1c97b
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 5a09eb2d88ce5a36f5c69dc827123c5d31d03f4b90bad1a7761ada2b171fb9d3
    fingerprint: c58e947d6a3caef9ad95f4f1bc5455e741209788ec6114cbfcdccff29e377a0e
    fingerprint_components:
      contract: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0a7a92beeb9a926f41a340b260a5a5f8c0ec96985b114418448e5ee03ab1616a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-vscode-extension-lifecycle
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
tags:
  - review:context-missing
---
