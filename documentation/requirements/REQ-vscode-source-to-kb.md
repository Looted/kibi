---
id: REQ-vscode-source-to-kb
title: "VS Code: Discovering KB context from editor"
status: open
created_at: 2026-05-13T00:00:00Z
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
---

The VS Code extension must surface KB context directly in the editor:

1. Registered symbols in the editor must show a `Kibi: Browse linked entities` code action.
2. Selecting the action must open a Quick Pick listing all related KB entities.
3. Symbols must also support a Code Lens showing the count of linked requirements/tests.
