---
id: TEST-vscode-traceability-coverage
title: Verify VS Code bidirectional traceability navigation
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
links:
  - type: validates
    target: REQ-vscode-traceability
  - type: validates
    target: SCEN-vscode-traceability-coverage
verification_scope: integration
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-vscode-traceability-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d6b133e233d8be2d116168f9
    test_id: TEST-vscode-traceability-coverage
    scope: integration
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: f31db0e901bcb6d3a953baf1fb32330aaa41cc3d774a8899400cc14fa4457f4f
    binding_hash: e26a993db31ff2615229c6ac8993aa22213ca1bcef836e20d17ce6240012130c
    fingerprint: 49830231f9d4e51d7325784379088c215ee78f18d5c5df51f4bbf42696823efc
    fingerprint_components:
      contract: f31db0e901bcb6d3a953baf1fb32330aaa41cc3d774a8899400cc14fa4457f4f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-vscode-traceability-coverage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Open a linked symbol from the KB tree and a linked requirement from the editor, asserting both navigation directions resolve the expected source and entity targets.
