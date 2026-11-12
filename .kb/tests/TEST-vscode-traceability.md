---
id: TEST-vscode-traceability
title: VS Code extension traceability feature tests
status: passing
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
    - symbol_id: SYM-e2e-traceability-gate
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8b6897d368329e6327f51fe8
    test_id: TEST-vscode-traceability
    scope: integration
    outcome: passed
    code_snapshot: b95fa37681e8a263f7711717a0c81ed6eb85ba81a6d11a9483e6acc81f4800fc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:13:27.832Z'
    finished_at: '2026-11-10T15:15:04.012Z'
    artifact_digest: e311e1bdb747c074c2fcdd92a0b37d5a65b4a4185c87a13ae58bb3a67554373b
    contract_hash: 4aec9506817a436c165d45b6f98b89f91f5981d26ccd4c93f30012638a228261
    binding_hash: 8e7835f82f9763c3e984d8e6743cd07714d65f4e79abc65c1216a98c94d5a1a7
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
