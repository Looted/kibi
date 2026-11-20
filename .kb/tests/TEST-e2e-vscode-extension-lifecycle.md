---
title: The built VS Code extension activates against a real Kibi workspace
status: passing
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
    receipt_id: PR-b4842a3da1ffeeffb837c0a2
    test_id: TEST-e2e-vscode-extension-lifecycle
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 34ef1eace590b79230ecc85980ecbcbb19878071dc114961ec22166c76038483
    binding_hash: 3209b0b634e9d15696fda230644754fa5fbe0be75b09b5357f805672f04ca6d0
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
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This bundles the shipped extension and activates it against a real workspace: tree, navigation to real coordinates, code lenses and context on open.
