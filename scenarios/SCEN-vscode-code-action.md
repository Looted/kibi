---
id: SCEN-vscode-code-action
title: Code action on a symbol opens Quick Pick of linked KB entities
status: active
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
priority: must
owner: dev
tags:
  - vscode
  - traceability
  - code-action
links:
  - REQ-vscode-traceability
---

Steps:
1. Developer places cursor on a symbol name in a `.ts` or `.js` file
2. VS Code shows a lightbulb; developer invokes `Kibi: Browse linked entities for "<symbol>"`
3. kibi looks up the symbol in `symbols.yaml` by title or by source file
4. A Quick Pick appears listing all related KB entities (from `links` + live relationship query)
5. Developer selects an entity; its source file opens in the editor
