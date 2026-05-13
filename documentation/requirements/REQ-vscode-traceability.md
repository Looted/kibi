---
id: REQ-vscode-traceability
title: "VS Code Extension Traceability: Umbrella"
status: open
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-05-13T00:00:00Z
source: packages/vscode/
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - traceability
links:
  - type: supersedes
    target: REQ-vscode-traceability-old
  - type: specifies
    target: REQ-vscode-kb-to-source
  - type: specifies
    target: REQ-vscode-source-to-kb
  - type: specifies
    target: REQ-vscode-sidebar-kb-tree
---

The Kibi VS Code extension provides bidirectional traceability between the knowledge base and source code.

This requirement is an umbrella doc for the following granular behaviors:
1. Navigation from KB Tree to Source (REQ-vscode-kb-to-source)
2. Discovering KB Context from Editor (REQ-vscode-source-to-kb)
3. Structural TreeView Sidebar (REQ-vscode-sidebar-kb-tree)
