---
id: ADR-annotation-strategy
title: "Use symbols.yaml manifest for code-symbol-to-entity mapping (no inline annotations)"
status: active
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
priority: must
tags:
  - vscode
  - annotation
  - symbols
  - manifest
links:
  - REQ-vscode-traceability
  - ADR-005
---

## Context

How should VS Code know which source symbols correspond to which KB entities?
Options: inline comments/decorators (`// @kibi: REQ-001`), a dedicated manifest
file (`symbols.yaml`), or language-server symbol index (SCIP).

## Decision

Use `symbols.yaml` manifest only. No inline annotations in source code.
The `KibiCodeActionProvider` reads the manifest and builds an index by title and
by source file path to match cursor position to KB entities.

## Consequences

- Source files remain annotation-free (no coupling to kibi syntax)
- Manifest must be kept in sync manually (or via `kibi sync`)
- `resolveManifestPath()` checks `.kb/config.json` for a custom path override
- Inverse direction (`constrained_by` from ADR to symbol) uses `relates_to` as
  a workaround because the schema only supports `constrained_by(symbol, adr)`
