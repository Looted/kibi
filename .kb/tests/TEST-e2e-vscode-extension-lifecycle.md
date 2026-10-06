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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fc5bc55f0e522e679d53ba20
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 1b29b8e056cef84c7b583bb7420046d82b6fdaa8668521bea921a46ac0ff17c9
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
tags:
  - review:context-missing
---
