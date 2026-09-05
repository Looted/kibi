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
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-vscode-traceability
      target: default
  success_policy: all_required_first_attempt
type: test
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
