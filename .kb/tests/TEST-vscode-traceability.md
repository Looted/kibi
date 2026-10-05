---
id: TEST-vscode-traceability
title: VS Code extension traceability feature tests
status: active
created_at: 2026-02-18T00:00:00.000Z
updated_at: 2026-03-19T00:00:00.000Z
priority: must
tags:
  - vscode
  - test
links:
  - REQ-vscode-traceability
  - type: validates
    target: SCEN-vscode-open-entity
  - type: validates
    target: SCEN-vscode-code-action
verification_scope: integration
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-vscode-traceability
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1173d60c4abcb39bfaed8e66
    test_id: TEST-vscode-traceability
    scope: integration
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: b1d83165d14d898d14e0486fbdc47fe172e606a918b27ee4ae7fa9c54dcd7256
    binding_hash: 76b684f5b1307d71048d2d3b91cccb8c9d0a3cfb675da93f614385807450d2a3
    fingerprint: 3dfb4b6ff00256eb7de7738d63fef3f62a97e653c7bc6c39aac89dde44b68361
    fingerprint_components:
      contract: b1d83165d14d898d14e0486fbdc47fe172e606a918b27ee4ae7fa9c54dcd7256
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
      - symbol_id: SYM-e2e-test-vscode-traceability
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
6 unit tests in `packages/vscode/tests/traceability.test.ts`:
- `isLocalPath` correctly identifies file paths vs HTTP URLs
- `resolveLocalPath` resolves `file://` URIs to absolute paths
- `parseRdfRelationships` extracts relationship triples from RDF/XML blocks
- Symbol YAML content is valid against the symbols schema
- `links` field serialisation round-trips correctly
- Source path resolution handles both absolute and workspace-relative paths

Additional tree view coverage in `packages/vscode/tests/extension.test.ts` verifies
that symbol nodes in the Kibi sidebar open the real code location from
`documentation/symbols.yaml` while remaining expandable for linked entities.
