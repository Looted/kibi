---
id: TEST-vscode-traceability-coverage
title: Verify VS Code bidirectional traceability navigation
status: passing
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
    - symbol_id: SYM-e2e-traceability-gate
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-afa73660343b354d63b1e8cf
    test_id: TEST-vscode-traceability-coverage
    scope: integration
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 4aec9506817a436c165d45b6f98b89f91f5981d26ccd4c93f30012638a228261
    binding_hash: d7d15b86c2ce8a991f2e71088b927caef229b5c2a425199c5fa9733fb7aa5310
    fingerprint: 4a1e8f59e1dbcd9cd5d560644a3aec18a1a78539d29fb04c8637454ab433c0f7
    fingerprint_components:
      contract: 4aec9506817a436c165d45b6f98b89f91f5981d26ccd4c93f30012638a228261
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
      - symbol_id: SYM-e2e-traceability-gate
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
Open a linked symbol from the KB tree and a linked requirement from the editor, asserting both navigation directions resolve the expected source and entity targets.
