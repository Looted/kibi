---
id: REQ-vscode-source-to-kb
title: 'VS Code: Discovering KB context from editor'
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/vscode/src/codeActionProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - discovery
links:
  - type: specified_by
    target: SCEN-vscode-source-to-kb
  - type: verified_by
    target: TEST-vscode-traceability
semantic_text: 'The VS Code extension must surface KB context directly in the editor:\n\nRegistered symbols in the editor must show a `Kibi: Browse linked entities` code action.\nSelecting the action must open a Quick Pick listing all related KB entities.\nSymbols must also support a Code Lens showing the count of linked requirements/tests.'
logic_claims:
  - CLAIM-D08F746F8E6A479F
semantic_clauses:
  - 'The VS Code extension must surface KB context directly in the editor:\n\nRegistered symbols in the editor must show a `Kibi: Browse linked entities` code action.\nSelecting the action must open a Quick Pick listing all related KB entities.\nSymbols must also support a Code Lens showing the count of linked requirements/tests'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cfeafeda8ae13ddabf51f413fa932c9e7967f9e9bc8a340b1e236d359e016c32
semantic_inventory:
  - claim_key: CLAIM-D08F746F8E6A479F
    claim_text: 'The VS Code extension must surface KB context directly in the editor:\n\nRegistered symbols in the editor must show a `Kibi: Browse linked entities` code action.\nSelecting the action must open a Quick Pick listing all related KB entities.\nSymbols must also support a Code Lens showing the count of linked requirements/tests'
    role: normative
    status: modeled
    span:
      start: 0
      end: 325
type: req
---

The VS Code extension must surface KB context directly in the editor:

1. Registered symbols in the editor must show a `Kibi: Browse linked entities` code action.
2. Selecting the action must open a Quick Pick listing all related KB entities.
3. Symbols must also support a Code Lens showing the count of linked requirements/tests.
