---
id: TEST-vscode-traceability
title: VS Code extension traceability feature tests
status: active
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
priority: must
tags:
  - vscode
  - test
links:
  - REQ-vscode-traceability
  - SCEN-vscode-open-entity
  - SCEN-vscode-code-action
---

6 unit tests in `packages/vscode/tests/traceability.test.ts`:
- `isLocalPath` correctly identifies file paths vs HTTP URLs
- `resolveLocalPath` resolves `file://` URIs to absolute paths
- `parseRdfRelationships` extracts relationship triples from RDF/XML blocks
- Symbol YAML content is valid against the symbols schema
- `links` field serialisation round-trips correctly
- Source path resolution handles both absolute and workspace-relative paths
